import { addNodeFilter } from "gatsby-source-wordpress-experimental/hooks"

/**
 * This filter adds a directory to the list of directories this plugin
 * will look in to find template-hierarchy templates
 * @param {string} directory
 */
export const addTemplateDirectory = (directory) => {
  addNodeFilter({
    name: `wp-template-directories`,
    filter: ({ data }) => {
      return [...data, directory]
    },
  })
}
