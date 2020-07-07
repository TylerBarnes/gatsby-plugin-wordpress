const { resolve } = require(`path`)
const path = require(`path`)
const glob = require(`glob`)
const chunk = require(`lodash/chunk`)
const merge = require(`lodash/merge`)
const kebabCase = require(`lodash/kebabCase`)

const {
  applyNodeFilter,
} = require(`gatsby-source-wordpress-experimental/utils/hooks`)
const { default: store } = require("gatsby-source-wordpress-experimental/store")

exports.createPages = async ({ actions, graphql }) => {
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
}

const createSinglePages = async ({
  routeConfig,
  graphql,
  actions,
  templates,
}) => {
  const { nodeListFieldName, nodeTypeName, sortArgs } = routeConfig

  let contentTypeTemplate = getTemplatePath({
    templates,
    pathEnding: `single/${nodeTypeName}`,
    fallBackPathEnding: `single/index`,
  })

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
    const { node, next, previous } = edge
    await actions.createPage({
      path: node.uri,
      component: resolve(contentTypeTemplate),
      context: {
        id: node.id,
        nextId: next?.id ?? firstNode.id,
        previousId: previous?.id ?? lastNode.id,
        isLast: !!next?.id,
        isFirst: !!previous?.id,
      },
    })
  }
}

const createPaginatedArchive = async (api) => {
  let {
    routeConfig: {
      nodeListFieldName,
      nodeTypeName,
      sortArgs,
      routeOptions,
      archivePathBase = ``,
    },
    graphql,
    templates,
    actions,
  } = api

  if (routeOptions?.archivePathBase) {
    archivePathBase = routeOptions.archivePathBase
  }

  if (archivePathBase.startsWith(`/`)) {
    archivePathBase = archivePathBase.substring(1)
  }

  if (archivePathBase.endsWith(`/`)) {
    archivePathBase = archivePathBase.slice(0, -1)
  }

  archivePathBase = kebabCase(archivePathBase)

  const { data } = await graphql(/* GraphQL */ `
    {
      ${nodeListFieldName}${sortArgs} {
        nodes {
          uri
          id
        }
      }
    }
  `)

  const { nodes } = data[nodeListFieldName]

  const foundTemplatePath = getTemplatePath({
    templates,
    pathEnding: `archive/${nodeTypeName}`,
    fallBackPathEnding: `archive/index`,
  })

  if (!foundTemplatePath) {
    console.log(`\n`)
    console.warn(`[gatsby-plugin-wordpress] Attempted to create paginated archive pages for ${nodeTypeName} nodes but no template and no default template exists. Create one at "./src/wp-templates/archive/${nodeTypeName}.js" or "./src/wp-templates/archive/index.js".\n\n If you don't want to create routes for this type, add the following to your plugin options for gatsby-plugin-wordpress:\n\n {
  type: {
    ${nodeTypeName}: {
      routes: {
        archive: false
      }
    }
  }
}`)
    console.log(`\n`)
    return
  }

  const perPage = routeOptions?.perPage ?? 10
  const chunkedContentNodes = chunk(nodes, perPage)

  const getArchivePageNumberPath = (pageNumber) => {
    if (pageNumber <= 0) {
      // if we ask for a page before 1, we should give the last archive page
      return `/${archivePathBase}/${chunkedContentNodes.length}/`
    } else if (pageNumber > chunkedContentNodes.length) {
      // if we ask for a page past the last one, return the first one
      return `/${archivePathBase}/`
    }

    // if this is the first page, return the archive path base
    return pageNumber === 1
      ? `/${archivePathBase}/`
      : // otherwise add the page number after the base
        `/${archivePathBase}/${pageNumber}/`
  }

  await Promise.all(
    chunkedContentNodes.map(async (nodesChunk, index) => {
      const firstNode = nodesChunk[0]
      const page = index + 1
      const offset = perPage * index
      const isFirst = page === 1
      const isLast = page === chunkedContentNodes.length
      const previousPagePath = getArchivePageNumberPath(page - 1)
      const nextPagePath = getArchivePageNumberPath(page + 1)

      await actions.createPage({
        component: resolve(foundTemplatePath),
        path: getArchivePageNumberPath(page),
        context: {
          firstId: firstNode.id,
          page: page,
          offset: offset,
          totalPages: chunkedContentNodes.length,
          isFirst,
          isLast,
          previousPagePath,
          nextPagePath,
          perPage,
        },
      })
    })
  )
}

// @todo move this into gatsby-source-wordpress
const getTypeOptions = ({ typeName }) => {
  const state = store.getState()

  const { pluginOptions } = state.gatsbyApi
  const { typeMap } = state.remoteSchema

  const __allTypeOptions = pluginOptions.type.__all

  const interfaceTypeOptions = typeMap
    .get(typeName)
    .interfaces.reduce((accumulator, current) => {
      const interfaceTypeOption = pluginOptions.type[current.name]

      if (interfaceTypeOption) {
        merge(accumulator, interfaceTypeOption)

        return accumulator
      }

      return accumulator
    }, {})

  const typeOptions = pluginOptions.type[typeName] || {}

  const combinedTypeOptions = {}

  merge(combinedTypeOptions, __allTypeOptions)
  merge(combinedTypeOptions, interfaceTypeOptions)
  merge(combinedTypeOptions, typeOptions)

  return combinedTypeOptions
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
      allWpContentType: { nodes: contentTypeNodes },
      allWpTaxonomy: { nodes: taxonomyNodes },
    },
  } = await graphql(/* GraphQL */ `
    query {
      allWpContentType {
        nodes {
          graphqlSingleName
          graphqlPluralName
        }
      }

      allWpTaxonomy {
        nodes {
          graphqlSingleName
          graphqlPluralName
        }
      }
    }
  `)

  // add the user type as a content type
  contentTypeNodes.push({
    graphqlSingleName: `user`,
    graphqlPluralName: `users`,
    name: `user`,
  })

  // use our remote schema root fields to find the
  // types of our graphql content types
  const contentTypes = [...contentTypeNodes, ...taxonomyNodes].map(
    ({ graphqlSingleName, graphqlPluralName }) => {
      const type = typeMap.get(
        rootFields.find((rootField) => rootField.name === graphqlSingleName)
          .type.name
      )

      delete type.fields

      return {
        ...type,
        archivePathBase: graphqlPluralName,
      }
    }
  )

  return contentTypes
}

const getRouteConfigs = async ({ graphql }) => {
  const { typePrefix } = store.getState().gatsbyApi.pluginOptions.schema
  const collectionGraphQLTypes = await getCollectionGraphQLTypes({ graphql })

  return collectionGraphQLTypes.map((collectionType) => {
    const { name, interfaces, archivePathBase } = collectionType
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

    const typeOptions = getTypeOptions({ typeName: name })

    return {
      nodeListFieldName,
      nodeTypeName: name,
      archivePathBase,
      sortArgs,
      typeOptions,
      routeOptions: collectionRouteOptions,
    }
  })
}

const getTemplatePath = ({ templates, pathEnding, fallBackPathEnding }) => {
  const templatePathEnding = `/wp-templates/${pathEnding}`

  const templatePath = templates.find((path) => {
    const templatePathWithoutExtension = path.substring(
      0,
      path.lastIndexOf(`.`)
    )

    return (
      templatePathWithoutExtension.endsWith(templatePathEnding) ||
      templatePathWithoutExtension.endsWith(fallBackPathEnding)
    )
  })

  return templatePath
}

const createPagesFromRouteConfig = async (api) => {
  const {
    routeConfig: { routeOptions },
  } = api

  if (!routeOptions) {
    return
  }

  if (routeOptions.single) {
    await createSinglePages(api)
  }

  if (routeOptions.archive) {
    await createPaginatedArchive(api)
  }
}
