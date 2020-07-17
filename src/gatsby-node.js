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

exports.createPages = async ({ actions, graphql, reporter }) => {
  try {
    const routeConfigs = await getRouteConfigs({ graphql })

    let allPageNodes = []

    function getRouteConfigApi(routeConfig) {
      const api = {
        routeConfig,
        actions,
        graphql,
        reporter,
      }

      return api
    }

    // first create all single pages
    for (const routeConfig of routeConfigs) {
      const api = getRouteConfigApi(routeConfig)

      const { routeOptions } = routeConfig

      if (!routeOptions) {
        return
      }

      if (routeOptions.single) {
        const pageNodes = await createSinglePages(api)

        // if createSinglePages returns nodes that created pages
        // we want to track them and pass them along to archive pages
        if (Array.isArray(pageNodes) && pageNodes.length) {
          allPageNodes = [...allPageNodes, ...pageNodes]
        }
      }
    }

    // then create archive pages
    // archive pages need to come second because
    // if an archive page is set to the same path as
    // a normal page, we want the archive page to
    // mix the data from the paginated archive
    // and the single node page
    for (const routeConfig of routeConfigs) {
      const api = getRouteConfigApi(routeConfig)
      const { routeOptions } = routeConfig

      if (routeOptions.archive) {
        await createPaginatedArchive({ ...api, pageNodes: allPageNodes })
      }
    }
  } catch (e) {
    e.message = `[gatsby-plugin-wordpress]: ${e.message}`
    reporter.panic(e)
  }
}

const createSinglePages = async ({ routeConfig, graphql, actions }) => {
  const { nodeListFieldName, nodeTypeName, sortArgs } = routeConfig

  const contentTypeTemplate = await getTemplatePath({
    nodeTypeName,
    templateType: `single`,
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

    const component = resolve(contentTypeTemplate)

    const context = {
      id: node.id,
      nextSinglePageId: next?.id ?? firstNode.id,
      previousSinglePageId: previous?.id ?? lastNode.id,
      isLastSingle: !!next?.id,
      isFirstSingle: !!previous?.id,
      isSingle: true,
      singleNodeType: nodeTypeName,
    }

    if (process.env.NODE_ENV === `development`) {
      // this is used to display in the console during development
      // so that each page can log which component it uses for debugging
      context.component__DEVELOPMENT_ONLY = component
    }

    // this pageContext is saved because we pass these node edges along
    // to createPaginatedArchive incase an archive page has the same
    // page path as a single page. In that case it should be both a single
    // page and an archive
    edge.context = context

    const pagePath =
      // make sure path ends in a forward slash
      node.uri.charAt(node.uri.length - 1) === "/" ? node.uri : `${node.uri}/`

    const pageConfig = {
      path: pagePath,
      component,
      context,
    }

    await actions.createPage(pageConfig)
  }

  return edges
}

const createPaginatedArchive = async (api) => {
  let {
    routeConfig: {
      nodeListFieldName,
      nodeTypeName,
      sortArgs,
      sortFields,
      sortOrder,
      routeOptions,
      archivePathBase = ``,
    },
    graphql,
    actions,
    reporter,
    pageNodes,
  } = api

  if (routeOptions?.archivePathBase) {
    archivePathBase = routeOptions.archivePathBase
  }

  if (!archivePathBase) {
    reporter.panic(
      `[gatsby-plugin-wordpress] No archive path found in WordPress for ${nodeTypeName} archive.\nWhen registering your post type, make sure has_archive is true. If you're using Custom Post Type UI, you can change this with the "Has Archive" setting in the CPT edit ui.\nIf you've registered your post type via PHP, refer to the docs https://developer.wordpress.org/reference/functions/register_post_type/.\nAlternatively, you can add an archivePathBase to the type options for this type:
      
      {
        resolve: "gatsby-plugin-wordpress",
        options: {
          type: {
            ${nodeTypeName}: {
              routes: {
                archive: true,
                archivePathBase: "fancy-page-path"
              }
            }
          }
        }
      }

      It's recommended to let WordPress handle this and to not use this option except as a last resort. If you use this option then WordPress will not be aware of the link to this archive page.

      If you don't want this type to have an archive page in your Gatsby site, then add this option:

      {
        resolve: "gatsby-plugin-wordpress",
        options: {
          type: {
            ${nodeTypeName}: {
              routes: {
                archive: false
              }
            }
          }
        }
      }
      `
    )

    return
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

  const foundTemplatePath = await getTemplatePath({
    nodeTypeName,
    templateType: `archive`,
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

  // this map is
  // page path (key) [/my-page/here/]
  // to node (object) { path: "/my-page/here/", id: "jkl3429d=", ...etc }
  // used to determine if an archive page is at the same page path as
  // a single post page. In that case the two should be combined.
  const pageNodesByPath = pageNodes?.reduce((accumulator, current) => {
    accumulator.set(current.node.uri, current)

    return accumulator
  }, new Map())

  await Promise.all(
    chunkedContentNodes.map(async (nodesChunk, index) => {
      // const offset = perPage * index
      const page = index + 1
      const isFirstArchivePage = page === 1
      const isLastArchivePage = page === chunkedContentNodes.length
      const previousArchivePath = getArchivePageNumberPath(page - 1)
      const nextArchivePath = getArchivePageNumberPath(page + 1)
      const archiveNodeIds = nodesChunk.map(({ id }) => id)

      const path = getArchivePageNumberPath(page)

      const component = resolve(foundTemplatePath)

      const context = {
        archivePage: page,
        totalArchivePages: chunkedContentNodes.length,
        isFirstArchivePage,
        isLastArchivePage,
        previousArchivePath,
        nextArchivePath,
        archiveNodeIds,
        sortFields,
        sortOrder,
        id: null,
        // if we have a single node for this path,
        // then add it's context here as well
        ...(pageNodesByPath.get(path)?.context || {}),
      }

      if (process.env.NODE_ENV === `development`) {
        // this is used to display in the console during development
        // so that each page can log which component it uses for debugging
        context.component__DEVELOPMENT_ONLY = component
      }

      const pageConfig = {
        component,
        path,
        context,
      }

      await actions.createPage(pageConfig)
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

  // this allows themes and plugins to register template directories
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
          archivePath
        }
      }

      allWpTaxonomy {
        nodes {
          graphqlSingleName
          archivePath
        }
      }
    }
  `)

  // add the user type as a content type
  contentTypeNodes.push({
    graphqlSingleName: `user`,
    archivePath: `users`,
    name: `user`,
  })

  // use our remote schema root fields to find the
  // types of our graphql content types
  const contentTypes = [...contentTypeNodes, ...taxonomyNodes].map(
    ({ graphqlSingleName, archivePath }) => {
      const type = typeMap.get(
        rootFields.find((rootField) => rootField.name === graphqlSingleName)
          .type.name
      )

      delete type.fields

      return {
        ...type,
        archivePathBase: archivePath,
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

    let sortFields = `null`
    let sortOrder = `DESC`
    let sortArgs = ``

    // content nodes can be sorted by date
    if (
      interfaces.find((interfaceType) => interfaceType.name === `ContentNode`)
    ) {
      sortFields = `date`
      sortArgs = `(sort: { fields: ${sortFields}, order: ${sortOrder} })`
    } else if (
      // user and term types can't be sorted by date so sort alphabetically
      name === `User` ||
      interfaces.find((interfaceType) => interfaceType.name === `TermNode`)
    ) {
      sortFields = `name`
      sortArgs = `(sort: { fields: ${sortFields}, order: ${sortOrder} })`
    }

    const typeOptions = getTypeOptions({ typeName: name })

    return {
      nodeListFieldName,
      nodeTypeName: name,
      archivePathBase,
      sortArgs,
      sortFields,
      sortOrder,
      typeOptions,
      routeOptions: collectionRouteOptions,
    }
  })
}

/**
 * findDesiredTemplateByPathEnding
 *
 * From all available and registered templates,
 * finds the first matching template
 * (subtracts the file extension to support tsx, js, jsx, etc)
 *
 * @param {string} templatePathEnding
 */
const findDesiredTemplateByPathEnding = async (templatePathEnding) => {
  const templates = await getTemplates()

  const stripExtensionFromPath = (path) => {
    const firstIndex = path.includes(`/wp-templates`)
      ? path.lastIndexOf(`/wp-templates`)
      : 0
    const lastIndex = path.includes(`.`) ? path.lastIndexOf(`.`) : path.length

    return path.substring(firstIndex, lastIndex)
  }

  const templatePathEndingWithoutExtension = stripExtensionFromPath(
    templatePathEnding
  )

  if (
    !templatePathEndingWithoutExtension ||
    templatePathEndingWithoutExtension === ``
  ) {
    return null
  }

  const matchedTemplate = templates.find((path) => {
    const templatePathWithoutExtension = stripExtensionFromPath(path)

    return templatePathWithoutExtension.endsWith(
      templatePathEndingWithoutExtension
    )
  })

  return matchedTemplate
}

/**
 * getTemplatePath
 *
 * takes a typename and a template type (either single or archive)
 * returns the most relevant template according to the template hierarchy
 * From least specific to most specific:
 * templates registered by plugins or themes -> site templates
 * node interface templates -> node type templates -> index.js (generic catch-all)
 *
 */
const getTemplatePath = async ({ nodeTypeName, templateType }) => {
  const state = store.getState()
  const { typeMap } = state.remoteSchema

  const nodeTypeInfo = typeMap.get(nodeTypeName)

  const nodeInterfaceTypeSettings = Object.entries(
    // convert plugin options type settings into an entries array
    state.gatsbyApi.pluginOptions.type
  )
    // filter type settings that aren't node interfaces
    .filter(([_, typeSetting]) => typeSetting.nodeInterface)
    // turn this back into an object
    .reduce((accumulator, [key, value]) => {
      accumulator[key] = value

      return accumulator
    }, {})

  const typeInterfaces = nodeTypeInfo?.interfaces || []

  const gatsbyNodeInterfacesThatIncludeThisType = typeInterfaces.filter(
    (typeInterface) => nodeInterfaceTypeSettings[typeInterface.name]
  )

  const interfaceTemplateNames = gatsbyNodeInterfacesThatIncludeThisType.map(
    ({ name }) => name
  )

  const templatesNamesToLookForInOrder = [
    nodeTypeName,
    ...interfaceTemplateNames,
    `index`,
  ]

  const availableTemplates = await Promise.all(
    templatesNamesToLookForInOrder.map((templateName) =>
      findDesiredTemplateByPathEnding(
        `/wp-templates/${templateType}/${templateName}`
      )
    )
  )

  // the first available template is the one we want
  // these have already been sorted above
  // availableTemplates[0] doesn't work because the first may return undefined
  // because each index corresponds to an entry in templatesNamesToLookForInOrder
  // availableTemplates check for each of those if a template exists.
  const template = availableTemplates.find(Boolean)

  return template
}
