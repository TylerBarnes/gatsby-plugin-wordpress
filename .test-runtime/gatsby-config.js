require(`dotenv`).config({
  path: `.env.GATSBY_CONCURRENT_DOWNLOAD`,
})

// require .env.development or .env.production
require(`dotenv`).config({
  path: `.env.test`,
})

// this is it's own conditional object so we can run
// an int test with all default plugin options
const wpPluginOptions = !process.env.DEFAULT_PLUGIN_OPTIONS
  ? {
      verbose: true,
      // for wp-graphql-gutenberg, attributes currently breaks due
      // to the origin schema. It works if we exclude attributes
      excludeFieldNames: [`commentCount`, `attributes`, `commentCount`],
      schema: {
        queryDepth: 5,
        typePrefix: `Wp`,
      },
      develop: {
        nodeUpdateInterval: 3000,
      },
      debug: {
        graphql: {
          showQueryOnError: false,
          showQueryVarsOnError: false,
          copyQueryOnError: false,
          panicOnError: false,
          // a critical error is a WPGraphQL query that returns an error and response data. Currently WPGQL will error if we try to access private posts so if this is false it returns a lot of irrelevant errors.
          onlyReportCriticalErrors: true,
          writeQueriesToDisk: true,
        },
      },
      type: {
        TypeLimitTest: {
          limit: 1,
        },
        TypeLimit0Test: {
          limit: 0,
        },
        TranslationFilterTest: {
          where: `language: FR`,
          beforeChangeNode: async ({ remoteNode, type }) => {
            if (remoteNode.language && remoteNode.language.slug !== `fr`) {
              return {
                cancelUpdate: true,
              }
            }
          },
        },
        Post: {
          limit:
            process.env.NODE_ENV === `development`
              ? // Lets just pull 50 posts in development to make it easy on ourselves.
                50
              : // and we don't actually need more than 1000 in production
                1000,
        },
      },
    }
  : {}

module.exports = {
  plugins: [
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/assets/images`,
      },
    },
    {
      resolve: require.resolve(`../package.json`),
      options: {
        url: process.env.WPGRAPHQL_URL,
        ...wpPluginOptions,
      },
    },
    `gatsby-plugin-chakra-ui`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-react-svg`,
      options: {
        rule: {
          include: /\.inline\.svg$/, // See below to configure properly
        },
      },
    },
    `gatsby-plugin-netlify-cache`,
  ],
}
