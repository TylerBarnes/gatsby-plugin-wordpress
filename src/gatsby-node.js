const { resolve } = require(`path`)
const path = require(`path`)
const glob = require(`glob`)
const chunk = require(`lodash/chunk`)
const merge = require(`lodash/merge`)
const kebabCase = require(`lodash/kebabCase`)
const fs = require(`fs-extra`)

const {
  applyNodeFilter,
} = require(`gatsby-source-wordpress-experimental/utils/hooks`)
const { default: store } = require("gatsby-source-wordpress-experimental/store")

const nodeTemplateStatusReasons = {
  noMatchingTemplateExists: `No matching template exists.`,
  noArchivePath: `No archive path found in WordPress or gatsby-config.js.`,
  archiveRoutingIsDisabledInConfig: `Archive routing is disabled for this type in gatsby-config.js.`,
  graphqlQueryErrored: `The GraphQL query for this node type returned errors`,
  nodeTypeDoesntExistInGatsby: `This node type doesn't exist in the Gatsby schema.`,
  pageWasCreatedWithTemplate: `Page was created with template.`,
}

const nodeTemplateStatuses = {
  rejected: `Rejected`,
  accepted: `Accepted`,
}

exports.createPages = async (gatsbyApi, pluginOptions) => {
  try {
    const { nodeTemplateReports } = await createPages(gatsbyApi, pluginOptions)
    await handleTemplateReports(gatsbyApi, pluginOptions, {
      nodeTemplateReports,
    })
  } catch (e) {
    e.message = `[gatsby-plugin-wordpress]: ${e.message}`
    gatsbyApi.reporter.panic(e)
  }
}

const getGatsbySchemaRootFieldNames = async ({ graphql }) => {
  const result = await graphql(/* GraphQL */ `
    {
      __schema {
        queryType {
          fields {
            name
          }
        }
      }
    }
  `)

  const {
    data: {
      __schema: {
        queryType: { fields },
      },
    },
  } = result

  const gatsbySchemaRootFields = fields.map(({ name }) => name)

  return gatsbySchemaRootFields
}

const createPages = async ({ actions, graphql, reporter }) => {
  const gatsbySchemaRootFields = await getGatsbySchemaRootFieldNames({
    graphql,
  })

  const routeConfigs = await getRouteConfigs({ graphql })

  function getRouteConfigApi(routeConfig) {
    const api = {
      routeConfig,
      actions,
      graphql,
      reporter,
      gatsbySchemaRootFields,
    }

    return api
  }

  let allNodeTemplateReports = []
  let allPageNodes = []

  // first create all single pages
  for (const routeConfig of routeConfigs) {
    const api = getRouteConfigApi(routeConfig)

    const { routeOptions, nodeListFieldName } = routeConfig

    if (!gatsbySchemaRootFields.includes(nodeListFieldName)) {
      allNodeTemplateReports.push({
        nodeTemplateStatus: nodeTemplateStatuses.rejected,
        reason: nodeTemplateStatusReasons.nodeTypeDoesntExistInGatsby,
        template: null,
        routeConfig,
        templateType: `single`,
      })
      continue
    }

    if (routeOptions.single) {
      const { edges, nodeTemplateReports = [] } =
        (await createSinglePages(api)) || {}

      allNodeTemplateReports = [
        ...allNodeTemplateReports,
        ...nodeTemplateReports,
      ]

      // if createSinglePages returns nodes that created pages
      // we want to track them and pass them along to archive pages
      if (Array.isArray(edges) && edges.length) {
        allPageNodes = [...allPageNodes, ...edges]
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
    const { routeOptions, nodeListFieldName } = routeConfig

    // if this type doesn't exist in Gatsby
    if (!gatsbySchemaRootFields.includes(nodeListFieldName)) {
      allNodeTemplateReports.push({
        nodeTemplateStatus: nodeTemplateStatuses.rejected,
        reason: nodeTemplateStatusReasons.nodeTypeDoesntExistInGatsby,
        template: null,
        routeConfig,
        templateType: `archive`,
      })
      continue
    }

    // if the route options for this type have archive templates turned off
    if (!routeOptions.archive) {
      allNodeTemplateReports.push({
        nodeTemplateStatus: nodeTemplateStatuses.rejected,
        reason: nodeTemplateStatusReasons.archiveRoutingIsDisabledInConfig,
        template: null,
        routeConfig,
        templateType: `archive`,
      })
      continue
    }

    const nodeTemplateReport = await createPaginatedArchive({
      ...api,
      pageNodes: allPageNodes,
    })

    allNodeTemplateReports.push(nodeTemplateReport)
  }

  return { nodeTemplateReports: allNodeTemplateReports }
}

const formatReports = (reportType, reports) =>
  reports.reduce(
    (accumulator, current) => {
      if (current.status === nodeTemplateStatuses.accepted) {
        accumulator.accepted[current.type] =
          accumulator.accepted[current.type] || []
        accumulator.accepted[current.type].push(current)
      } else {
        accumulator.rejected[current.type] =
          accumulator.rejected[current.type] || []
        accumulator.rejected[current.type].push(current)
      }

      return accumulator
    },
    {
      reportType,
      rejected: {},
      accepted: {},
    }
  )

const handleTemplateReports = async (
  _gatsbyApi,
  pluginOptions,
  { nodeTemplateReports }
) => {
  const { templateRouting: reportTemplateRouting = false } =
    pluginOptions?.reports ?? {}

  if (!reportTemplateRouting) {
    return
  }

  const normalizedReports = nodeTemplateReports.map((report) => {
    return {
      template: report?.template?.replace(process.cwd(), `.`) ?? null,
      id: report?.node?.id ?? null,
      type: report?.routeConfig?.nodeTypeName ?? null,
      kind: report?.templateType,
      reason: report?.reason,
      status: report?.nodeTemplateStatus,
      path: report?.node?.uri ?? report?.routeConfig?.archivePathBase,
    }
  })

  const archiveReports = formatReports(
    `Archive report`,
    normalizedReports.filter((report) => report.kind === `archive`)
  )

  const singleReports = formatReports(
    `Single page report`,
    normalizedReports.filter((report) => report.kind === `single`)
  )

  const directory = `${process.cwd()}/WordPress/reports`

  await fs.ensureDir(directory)

  await fs.writeFile(
    `${directory}/single-page-routing.json`,
    JSON.stringify(singleReports, null, 2),
    `utf8`
  )

  await fs.writeFile(
    `${directory}/archive-page-routing.json`,
    JSON.stringify(archiveReports, null, 2),
    `utf8`
  )
}

const createSinglePages = async ({ routeConfig, graphql, actions }) => {
  const { nodeListFieldName, nodeTypeName, sortArgs } = routeConfig

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

  const nodeTemplateReports = []
  const templateType = `single`

  for (const edge of edges) {
    const { node, next, previous } = edge

    const template = await getTemplatePath({
      nodeTypeName,
      templateType,
      node,
    })

    if (!template) {
      nodeTemplateReports.push({
        node,
        nodeTypeName,
        templateType,
        routeConfig,
        template: null,
        reason: nodeTemplateStatusReasons.noMatchingTemplateExists,
        nodeTemplateStatus: nodeTemplateStatuses.rejected,
      })
      continue
    } else {
      nodeTemplateReports.push({
        node,
        routeConfig,
        templateType,
        template: template,
        reason: nodeTemplateStatusReasons.pageWasCreatedWithTemplate,
        nodeTemplateStatus: nodeTemplateStatuses.accepted,
      })
    }

    const component = resolve(template)

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

  return { edges, nodeTemplateReports }
}

const createPaginatedArchive = async (api) => {
  const { routeConfig, graphql, actions, pageNodes } = api

  let {
    nodeListFieldName,
    nodeTypeName,
    sortArgs,
    sortFields,
    sortOrder,
    routeOptions,
    archivePathBase = ``,
  } = routeConfig

  const templateType = `archive`

  if (routeOptions?.archivePathBase) {
    archivePathBase = routeOptions.archivePathBase
  }

  if (!archivePathBase) {
    return {
      nodeTemplateStatus: nodeTemplateStatuses.rejected,
      reason: nodeTemplateStatusReasons.noArchivePath,
      routeConfig,
      templateType,
    }
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

  const { nodes, errors } = data?.[nodeListFieldName] ?? {}

  if (errors?.length) {
    return {
      nodeTemplateStatus: nodeTemplateStatuses.rejected,
      reason: nodeTemplateStatusReasons.graphqlQueryErrored,
      errors,
      routeConfig,
      templateType,
    }
  }

  const foundTemplatePath = await getTemplatePath({
    nodeTypeName,
    templateType,
  })

  if (!foundTemplatePath) {
    return {
      nodeTemplateStatus: nodeTemplateStatuses.rejected,
      reason: nodeTemplateStatusReasons.noMatchingTemplateExists,
      routeConfig,
      templateType,
    }
  }

  const component = resolve(foundTemplatePath)

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

      let context = {
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
      }

      // if we have a single node for this path,
      const correspondingSinglePageContext = pageNodesByPath.get(path)?.context

      // then add it's context here as well
      if (correspondingSinglePageContext) {
        context = {
          ...context,
          ...correspondingSinglePageContext,
        }
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

  return {
    nodeTemplateStatus: nodeTemplateStatuses.accepted,
    reason: nodeTemplateStatusReasons.pageWasCreatedWithTemplate,
    template: component,
    routeConfig,
    templateType,
  }
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
          name
        }
      }

      allWpTaxonomy {
        nodes {
          graphqlSingleName
          archivePath
          name
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
    ({ graphqlSingleName, archivePath, name }) => {
      const type = typeMap.get(
        rootFields.find((rootField) => rootField.name === graphqlSingleName)
          .type.name
      )

      delete type.fields

      let archivePathBase = archivePath

      if (!archivePathBase || archivePathBase === "") {
        archivePathBase = `/${name}/`
      }

      return {
        ...type,
        archivePathBase,
      }
    }
  )

  return contentTypes
}

const getRouteConfigs = async ({ graphql }) => {
  const { typePrefix } = store.getState().gatsbyApi.pluginOptions.schema
  const collectionGraphQLTypes = await getCollectionGraphQLTypes({ graphql })

  const normalizedCollectionGraphQLTypes = collectionGraphQLTypes.map(
    (collectionType) => {
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
    }
  )
  // .filter(({ nodeListFieldName }) =>
  //   // only create routes if the node list field actually exists in
  //   // the Gatsby schema
  //   gatsbySchemaRootFields.includes(nodeListFieldName)
  // )

  return normalizedCollectionGraphQLTypes
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

const highlySpecificPathWarning = {}
/**
 * getTemplatePath
 *
 * takes a typename and a template type (either single or archive)
 * returns the most relevant template according to the template hierarchy
 * From least specific to most specific:
 * templates registered by plugins or themes -> site templates
 * node interface templates -> node type templates -> node type template with field value specifier
 *
 */
const getTemplatePath = async ({ nodeTypeName, templateType, node }) => {
  const state = store.getState()
  const {
    gatsbyApi: { helpers },
  } = state
  const { typeMap } = state.remoteSchema

  const nodeTypeInfo = typeMap.get(nodeTypeName)

  const templates = await getTemplates()

  const templatesWithFieldValueSpecifiers = templates
    .map((templatePath) => {
      if (!node) {
        return false
      }

      const pathSplitOnSpaces = templatePath.split(` `)
      // we're delimiting field names and values by spaces
      // so if there are less than 2 spaces, we can skip this template
      if (pathSplitOnSpaces.length - 1 < 2) {
        return false
      }

      const fileNameNoExtension = path.basename(
        templatePath,
        path.extname(templatePath)
      )

      const fileNameSplitOnSpaces = fileNameNoExtension.split(` `)

      const [typeName, fieldName, ...remainingItems] = fileNameSplitOnSpaces

      if (typeName !== nodeTypeName) {
        return false
      }

      const value = remainingItems.join(` `)

      const gatsbyNode = helpers.getNode(node.id)
      const nodeFieldValue = gatsbyNode[fieldName]
      if (
        nodeFieldValue === Number(value) ||
        (typeof nodeFieldValue === `string` &&
          (`"${nodeFieldValue}"` === value || `'${nodeFieldValue}'` === value))
      ) {
        return templatePath
      }

      return false
    })
    .filter(Boolean)

  if (
    templatesWithFieldValueSpecifiers.length > 1 &&
    !highlySpecificPathWarning[node.id]
  ) {
    highlySpecificPathWarning[node.id] = true
    helpers.reporter.log(``)
    helpers.reporter.warn(
      `[gatsby-plugin-wordpress] more than 1 highly specific template found for node "${
        node.id
      }".\nUsing the first available template.\n\n${templatesWithFieldValueSpecifiers.join(
        `,\n`
      )}\n`
    )
  }

  if (templatesWithFieldValueSpecifiers.length) {
    return templatesWithFieldValueSpecifiers[0]
  }

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

  const { useInterfaceTemplates = true } =
    getTypeOptions({ typeName: nodeTypeName }).routes ?? {}

  const typeInterfaces =
    // if there are interfaces
    // and interface templates aren't disabled for this type
    nodeTypeInfo?.interfaces && useInterfaceTemplates
      ? // get a list of node interfaces
        nodeTypeInfo?.interfaces
      : // otherwise return an empty array so no interface
        // templates are found for this type
        []

  const gatsbyNodeInterfacesThatIncludeThisType = typeInterfaces.filter(
    (typeInterface) => nodeInterfaceTypeSettings[typeInterface.name]
  )

  const interfaceTemplateNames = gatsbyNodeInterfacesThatIncludeThisType.map(
    ({ name }) => name
  )

  const templateHierarchy = [
    nodeTypeName,
    ...interfaceTemplateNames,
    // `index`,
  ]

  const availableTemplates = await Promise.all(
    templateHierarchy.map((templateName) =>
      findDesiredTemplateByPathEnding(
        `/wp-templates/${templateType}/${templateName}`
      )
    )
  )

  // the first available template is the one we want
  // these have already been sorted above
  // availableTemplates[0] doesn't work because the first may return undefined
  // because each index corresponds to an entry in templateHierarchy
  // availableTemplates checks for each of those if a template exists.
  const template = availableTemplates.find(Boolean)

  return template
}
