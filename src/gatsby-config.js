const merge = require("lodash/merge")

module.exports = (options) => ({
  plugins: [
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    `gatsby-plugin-root-import`,
    {
      resolve: `gatsby-source-wordpress-experimental`,
      options: merge(
        {
          type: {
            __all: {
              pages: {
                single: false,
                archive: false,
              },
            },
            PostFormat: {
              pages: {
                single: false,
                archive: false,
              },
            },
            ContentNode: {
              pages: {
                single: true,
                archive: true,
              },
            },
            TermNode: {
              pages: {
                single: true,
                archive: true,
              },
            },
            MediaItem: {
              pages: {
                single: true,
                archive: true,
                useInterfaceTemplates: false,
              },
            },
          },
        },
        options
      ),
    },
  ],
})
