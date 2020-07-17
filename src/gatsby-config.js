const merge = require("lodash/merge")

module.exports = (options) => ({
  plugins: [
    {
      resolve: `gatsby-source-wordpress-experimental`,
      options: merge(
        {
          type: {
            __all: {
              routes: {
                single: false,
                archive: false,
              },
            },
            PostFormat: {
              routes: {
                single: false,
                archive: false,
              },
            },
            ContentNode: {
              routes: {
                single: true,
                archive: true,
              },
            },
            TermNode: {
              routes: {
                single: true,
                archive: true,
              },
            },
            MediaItem: {
              routes: {
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
