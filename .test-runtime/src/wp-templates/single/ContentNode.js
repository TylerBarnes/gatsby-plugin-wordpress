import React from "react"
import { graphql } from "gatsby"
import BlogPost from "../../components/template-parts/blog-post"

export default ({ data }) => <BlogPost data={data} />

export const query = graphql`
  query page($id: String!, $nextPage: String, $previousPage: String) {
    page: wpContentNode(id: { eq: $id }) {
      ... on WpNodeWithTitle {
        title
      }
      ... on WpNodeWithContentEditor {
        content
      }

      ... on WpNodeWithFeaturedImage {
        featuredImage {
          node {
            localFile {
              ...HeroImage
            }
          }
        }
      }
    }

    nextPage: wpContentNode(id: { eq: $nextPage }) {
      ... on WpNodeWithTitle {
        title
      }
      link
    }

    previousPage: wpContentNode(id: { eq: $previousPage }) {
      ... on WpNodeWithTitle {
        title
      }
      link
    }
  }
`
