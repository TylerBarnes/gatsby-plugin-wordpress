import fs from "fs-extra"

describe(`[gatsby-plugin-wordpress] routing`, () => {
  test(`Archive template routing is working`, async () => {
    const archiveReport = await fs.readJson(
      `./.test-runtime/WordPress/reports/archive-pages.json`
    )

    expect(archiveReport.rejected.MediaItem).toBeTruthy()
    expect(archiveReport.accepted.MediaItem).toBeFalsy()

    expect(archiveReport.rejected.TypeLimitTest).toBeTruthy()
    expect(archiveReport.accepted.TypeLimitTest).toBeFalsy()

    expect(archiveReport.rejected.TypeLimit0Test).toBeTruthy()
    expect(archiveReport.accepted.TypeLimit0Test).toBeFalsy()

    expect(archiveReport.accepted.Post).toBeTruthy()
    expect(archiveReport.rejected.Post).toBeFalsy()

    expect(archiveReport.accepted.Page).toBeTruthy()
    expect(archiveReport.rejected.Page).toBeFalsy()

    expect(archiveReport.accepted.TeamMember).toBeTruthy()
    expect(archiveReport.rejected.TeamMember).toBeFalsy()

    expect(archiveReport.accepted.Project).toBeTruthy()
    expect(archiveReport.rejected.Project).toBeFalsy()

    expect(archiveReport).toMatchSnapshot()
  })

  test(`Single template routing is working`, async () => {
    const singleReport = await fs.readJson(
      `./.test-runtime/WordPress/reports/single-pages.json`
    )

    expect(singleReport.rejected.MediaItem).toBeTruthy()
    expect(singleReport.accepted.MediaItem).toBeFalsy()

    expect(singleReport.rejected.TypeLimitTest).toBeTruthy()
    expect(singleReport.accepted.TypeLimitTest).toBeFalsy()

    expect(singleReport.rejected.TypeLimit0Test).toBeTruthy()
    expect(singleReport.accepted.TypeLimit0Test).toBeFalsy()

    expect(singleReport.rejected.Category).toBeTruthy()
    expect(singleReport.accepted.Category).toBeFalsy()

    expect(singleReport.rejected.PostFormat).toBeTruthy()
    expect(singleReport.accepted.PostFormat).toBeFalsy()

    expect(singleReport.accepted.Post).toBeTruthy()
    expect(singleReport.rejected.Post).toBeFalsy()

    expect(singleReport.accepted.Page).toBeTruthy()
    expect(singleReport.rejected.Page).toBeFalsy()

    expect(singleReport.accepted.TeamMember).toBeTruthy()
    expect(singleReport.rejected.TeamMember).toBeFalsy()

    expect(singleReport.accepted.Project).toBeTruthy()
    expect(singleReport.rejected.Project).toBeFalsy()

    expect(singleReport.accepted.TranslationFilterTest).toBeTruthy()
    expect(singleReport.rejected.TranslationFilterTest).toBeFalsy()

    expect(singleReport).toMatchSnapshot()
  })
})
