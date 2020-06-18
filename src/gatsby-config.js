module.exports = (options) => ({
  plugins: [
    // `gatsby-plugin-sharp`,
    // {
    //   resolve: `gatsby-source-filesystem`,
    //   options: {
    //     name: `images`,
    //     path: `${__dirname}/src/images`,
    //   },
    // },
    {
      resolve: `gatsby-source-wordpress-experimental`,
      options,
    },
    // `gatsby-transformer-sharp`,
  ],
})
