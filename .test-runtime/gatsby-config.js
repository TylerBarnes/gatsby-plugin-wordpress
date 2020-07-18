require(`dotenv`).config({
  path: `.env.GATSBY_CONCURRENT_DOWNLOAD`,
})

// require .env.development or .env.production
require(`dotenv`).config({
  path: `.env.test`,
})

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
        reports: {
          templateRouting: true,
        },
        type: {
          TypeLimitTest: {
            pages: {
              useInterfaceTemplates: false,
            },
          },
          TypeLimit0Test: {
            pages: {
              useInterfaceTemplates: false,
            },
          },
        },
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
