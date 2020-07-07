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
            ContentNode: {
              routes: {
                single: true,
                archive: false,
              },
            },
            MediaItem: {
              routes: {
                single: false,
                archive: false,
              },
            },
          },
        },
        options
      ),
    },
  ],
})
