/* eslint strict: 0 */

const logStyles =
  "font-size: 15px; font-weight: bold; padding: 10px 20px; background: black; color: white;"

/**
 * This export adds helper messages to the browser console in development
 * It can be turned off by setting the plugin option browserConsoleHelp to false.
 * It's enabled by default
 */
exports.wrapPageElement =
  process.env.NODE_ENV === `development`
    ? ({ element, props }, { browserConsoleHelp = true }) => {
        if (!browserConsoleHelp) {
          console.log(
            `[gatsby-plugin-wordpress] add { options: { browserConsoleHelp: true } } to your plugin options in gatsby-config.js for help with this page`
          )
          return element
        }

        const {
          pageContext: { isArchive, isSingle },
        } = props
        const pageTypeString =
          isArchive && isSingle
            ? `archive/single`
            : isArchive
            ? `archive`
            : `single`

        console.log(
          `%c🚀[gatsby-plugin-wordpress] The template used for this ${pageTypeString} page is:\n${props.pageContext.component__DEVELOPMENT_ONLY}`,
          logStyles
        )
        console.log(
          `%c🚀[gatsby-plugin-wordpress] props.data is the result of the GraphQL query for this ${pageTypeString} page:`,
          logStyles
        )
        console.log(props.data)
        console.log(
          `%c🚀[gatsby-plugin-wordpress] props.pageContext contains the variables passed to your page component and GraphQL query for this page:`,
          logStyles
        )
        delete props.pageContext.component__DEVELOPMENT_ONLY
        console.log(props.pageContext)

        return element
      }
    : false
