import { addNodeFilter } from "gatsby-source-wordpress-experimental/hooks"

export const addTemplateDirectory = (directory) => {
  addNodeFilter({
    name: `wp-template-directories`,
    filter: ({ data }) => {
      return [...data, directory]
    },
  })
}
