import { useContext } from "react"
import { Context } from "./context"

const DoAction = ({ name }) => {
  const {
    state: { actions },
  } = useContext(Context)
  const doableActions = actions.filter((action) => action.name === name)

  return doableActions.map(({ action: Action }) => Action)
}

export { DoAction }
