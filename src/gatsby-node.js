const { resolve } = require(`path`)
const path = require(`path`)
const glob = require(`glob`)
const chunk = require(`lodash/chunk`)

const {
  applyNodeFilter,
} = require(`gatsby-source-wordpress-experimental/utils/hooks`)

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

exports.createPages = async ({ actions, graphql }, pluginOptions) => {
  const { typePrefix } = pluginOptions.schema

  if (!typePrefix) {
    return
  }

  const templates = await getTemplates()

  const {
    data: {
      allWpContentNode: { nodes: contentNodes },
    },
  } = await graphql(/* GraphQL */ `
    query ALL_CONTENT_NODES {
      all${typePrefix}ContentNode(
        sort: { fields: modifiedGmt, order: DESC }
        # filter: { nodeType: { ne: "MediaItem" } }
      ) {
        nodes {
          nodeType
          uri
          id
        }
      }
    }
  `)

  const contentTypeTemplateDirectory = `/wp-templates/single/`
  const contentTypeTemplates = templates.filter((path) =>
    path.includes(contentTypeTemplateDirectory)
  )

  await Promise.all(
    contentNodes.map(async (node, i) => {
      const { nodeType, uri, id } = node

      const templatePathEnding = `/wp-templates/single/${nodeType}.js`

      const contentTypeTemplate = contentTypeTemplates.find((path) =>
        path.endsWith(templatePathEnding)
      )

      if (!contentTypeTemplate) {
        return
      }

      await actions.createPage({
        component: resolve(contentTypeTemplate),
        path: uri,
        context: {
          id,
          nextPage: (contentNodes[i + 1] || {}).id,
          previousPage: (contentNodes[i - 1] || {}).id,
        },
      })
    })
  )

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
