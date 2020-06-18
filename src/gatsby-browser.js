const React = require("react")

const Context = require(`./context`)

class RootWrapper extends React.Component {
  state = {
    actions: [
      {
        name: `after-title`,
        action: () => <>after the title</>,
      },
    ],
  }

  componentDidMount() {
    console.log(this.state)
    console.log(this.props)
  }

  render() {
    return (
      <Context.Provider
        value={null}
        //   value={{
        //     state,
        //     setState,
        //   }}
      >
        test
        {/* {this.props.element} */}
      </Context.Provider>
    )
  }
}

exports.wrapRootElement = RootWrapper
