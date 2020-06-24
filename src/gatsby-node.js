const { resolve } = require(`path`)
const path = require(`path`)
const glob = require(`glob`)
const chunk = require(`lodash/chunk`)

const {
  applyNodeFilter,
} = require(`gatsby-source-wordpress-experimental/utils/hooks`)
const { default: store } = require("gatsby-source-wordpress-experimental/store")

const getTypeOptions = ({ typeName }) => {
  const { pluginOptions } = store.getState().gatsbyApi

  const __allTypeOptions = pluginOptions.type.__all
  const typeOptions = pluginOptions.type[typeName] || {}

  return { ...__allTypeOptions, ...typeOptions }
}

const getTypeNameRouteOptions = (typeName) => {
  const { routes } = getTypeOptions({ typeName })
  return routes
}

const getTemplates = async () => {
  const sitePath = path.resolve(`./`)

  const templateDirectories = await applyNodeFilter({
    name: `wp-template-directories`,
    data: [],
  })

  let pluginTemplates = []

  for (const templateDirectory of templateDirectories) {
    pluginTemplates = [
      ...glob.sync(`${templateDirectory}/**/*.js`),
      ...pluginTemplates,
    ]
  }

  const userTemplates = glob.sync(`./src/wp-templates/**/*.js`, {
    cwd: sitePath,
  })

  return [...userTemplates, ...pluginTemplates]
}

/**
 * Returns a list of WPGraphQL types that pages should be created from.
 *
 * @param {function} graphql The Gatsby GraphQL function
 */
const getCollectionGraphQLTypes = async ({ graphql }) => {
  const { introspectionData, typeMap } = store.getState().remoteSchema

  // get remote schema root query fields
  const rootFields = introspectionData.__schema.types.find(
    (type) => type.name === `RootQuery`
  ).fields

  // get WPGraphQL content types
  const {
    data: {
      allWpContentType: { nodes },
    },
  } = await graphql(/* GraphQL */ `
    query {
      allWpContentType {
        nodes {
          graphqlSingleName
        }
      }
    }
  `)

  // add the user type as a content type
  nodes.push({ graphqlSingleName: `user` })

  // get all taxonomy types
  const taxonomyTypes = introspectionData.__schema.types
    .find((type) => type.name === `TermNode`)
    .possibleTypes.filter((possibleType) => possibleType.name !== `PostFormat`)
    .map((possibleType) => typeMap.get(possibleType.name))

  // use our remote schema root fields to find the
  // types of our graphql content types
  const contentTypes = nodes.map((contentType) =>
    typeMap.get(
      rootFields.find(
        (rootField) => rootField.name === contentType.graphqlSingleName
      ).type.name
    )
  )

  return [...contentTypes, ...taxonomyTypes]
}

const getRouteConfigs = async ({ graphql }) => {
  const { typePrefix } = store.getState().gatsbyApi.pluginOptions.schema
  const collectionGraphQLTypes = await getCollectionGraphQLTypes({ graphql })

  return collectionGraphQLTypes.map((collectionType) => {
    const { name, interfaces } = collectionType
    const collectionRouteOptions = getTypeNameRouteOptions(name)
    const nodeListFieldName = `all${typePrefix}${name}`

    let sortArgs = ``

    // content nodes can be sorted by date
    if (
      interfaces.find((interfaceType) => interfaceType.name === `ContentNode`)
    ) {
      sortArgs = `(sort: { fields: modifiedGmt, order: DESC })`
    } else if (
      // user and term types can't be sorted by date so sort alphabetically
      name === `User` ||
      interfaces.find((interfaceType) => interfaceType.name === `TermNode`)
    ) {
      sortArgs = `(sort: { fields: name, order: DESC })`
    }

    return {
      nodeListFieldName,
      nodeTypeName: name,
      sortArgs,
      routeOptions: collectionRouteOptions,
    }
  })
}

const createSinglePages = async ({
  routeConfig,
  graphql,
  actions,
  templates,
}) => {
  const { nodeListFieldName, nodeTypeName, sortArgs } = routeConfig

  const contentTypeTemplateDirectory = `/wp-templates/single/`
  const contentTypeTemplates = templates.filter((path) =>
    path.includes(contentTypeTemplateDirectory)
  )

  const templatePathEnding = `/wp-templates/single/${nodeTypeName}.js`

  const contentTypeTemplate = contentTypeTemplates.find((path) =>
    path.endsWith(templatePathEnding)
  )

  if (!contentTypeTemplate) {
    console.log(`\n`)
    console.warn(`[gatsby-plugin-wordpress] Attempted to create routes for ${nodeTypeName} nodes but no template and no default template exists. Create one at "./src/wp-templates/single/${nodeTypeName}.js" or "./src/wp-templates/single/index.js".\n\n If you don't want to create routes for this type, add the following to your plugin options for gatsby-plugin-wordpress:\n\n {
  type: {
    ${nodeTypeName}: {
      routes: {
        single: false
      }
    }
  }
}`)
    console.log(`\n`)
    return
  }

  const result = await graphql(/* GraphQL */ `
      query COLLECTION {
        ${nodeListFieldName}${sortArgs} {
          edges {
            node {
              uri
              id
            }
            next {
              id
            }
            previous {
              id
            }
          }
        }
      }
    `)

  const { edges } = result?.data?.[nodeListFieldName] ?? {}

  if (!edges) {
    return
  }

  const firstNode = edges[0]
  const lastNode = edges[edges.length - 1]

  for (const edge of edges) {
    const { uri, id } = edge

    await actions.createPage({
      path: edge.node.uri,
      component: resolve(contentTypeTemplate),
      context: {
        id: edge.node.id,
        nextId: edge.next?.id ?? firstNode.id,
        previousId: edge.previous?.id ?? lastNode.id,
        isLast: !!edge.next?.id,
        isFirst: !!edge.previous?.id,
      },
    })
  }
}

const createPagesFromRouteConfig = async (api) => {
  const { routeConfig, actions, graphql } = api

  const { nodeListFieldName, routeOptions } = routeConfig

  if (routeOptions.single) {
    await createSinglePages(api)
  }

  if (routeOptions.archive) {
    // await createPaginatedArchive(api)
  }
}

exports.createPages = async ({ actions, graphql }, pluginOptions) => {
  const { typePrefix } = store.getState().gatsbyApi.pluginOptions.schema

  const templates = await getTemplates()
  const routeConfigs = await getRouteConfigs({ graphql })

  for (const routeConfig of routeConfigs) {
    await createPagesFromRouteConfig({
      routeConfig,
      actions,
      graphql,
      templates,
    })
  }

  const postFieldName = `all${typePrefix}Post`

  // create the homepage
  const { data } = await graphql(/* GraphQL */ `
    {
      ${postFieldName}(sort: { fields: modifiedGmt, order: DESC }) {
        nodes {
          uri
          id
        }
      }
    }
  `)

  const allWpPost = data[postFieldName]

  const perPage = 10
  const chunkedContentNodes = chunk(allWpPost.nodes, perPage)

  await Promise.all(
    chunkedContentNodes.map(async (nodesChunk, index) => {
      const firstNode = nodesChunk[0]
      const page = index + 1
      const offset = perPage * index

      await actions.createPage({
        component: resolve(`./src/wp-templates/index.js`),
        path: page === 1 ? `/blog/` : `/blog/${page}/`,
        context: {
          firstId: firstNode.id,
          page: page,
          offset: offset,
          totalPages: chunkedContentNodes.length,
          perPage,
        },
      })
    })
  )
}
