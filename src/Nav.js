import React, { cloneElement } from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import all from 'react-prop-types/lib/all';
import warning from 'warning';
import deprecated from 'react-prop-types/lib/deprecated';
import keycode from 'keycode';
import tbsUtils, { bsStyles, bsClass as _bsClass } from './utils/bootstrapUtils';
import * as tabUtils from './utils/tabUtils';

import ValidComponentChildren from './utils/ValidComponentChildren';
import chain from './utils/createChainedFunction';

import Collapse from './Collapse';

class Nav extends React.Component {

  componentWillMount() {
    this.setIds(this.props, this.context);
  }

  componentWillReceiveProps(nextProps, nextContext) {
    this.setIds(nextProps, nextContext);
  }

  componentDidUpdate() {
    if (this._needsRefocus) {
      let ul = this.refs.ul && ReactDOM.findDOMNode(this.refs.ul);
      let tabs = ul ? ul.children || [] : [];
      let tabIdx = this.eventKeys().indexOf(this.getActiveKey());

      this._needsRefocus = false;
      if (tabIdx !== -1) {
        let tabNode = tabs[tabIdx];

        if (tabNode && tabNode.firstChild) {
          tabNode.firstChild.focus();
        }
      }
    }
  }

  render() {
    const { className, ulClassName, id, ulId } = this.props;
    const isNavbar = this.props.navbar != null ? this.props.navbar : this.context.$bs_navbar;
    const classes = tbsUtils.getClassSet(this.props);

    classes[tbsUtils.prefix(this.props, 'stacked')] = this.props.stacked;
    classes[tbsUtils.prefix(this.props, 'justified')] = this.props.justified;

    if (isNavbar) {
      let bsClass = this.context.$bs_navbar_bsClass || 'navbar';
      const navbarRight = this.props.right != null ? this.props.right : this.props.pullRight;

      classes[tbsUtils.prefix({ bsClass }, 'nav')] = true;
      classes[tbsUtils.prefix({ bsClass }, 'right')] = navbarRight;
      classes[tbsUtils.prefix({ bsClass }, 'left')] = this.props.pullLeft;
    } else {
      classes['pull-right'] = this.props.pullRight;
      classes['pull-left'] = this.props.pullLeft;
    }

    let list = (
      <ul ref="ul"
        {...this.props}
        id={ulId || id}
        role={this.props.bsStyle === 'tabs' ? 'tablist' : null}
        className={classNames(className, ulClassName, classes)}
      >
        {ValidComponentChildren.map(this.props.children, this.renderNavItem, this)}
      </ul>
    );

    // TODO remove in 0.29
    if (this.context.$bs_deprecated_navbar && this.props.collapsible) {
      list = (
        <Collapse
          in={this.props.expanded}
          className={isNavbar ? 'navbar-collapse' : void 0}
        >
          <div>
            { list }
          </div>
        </Collapse>
      );
    }

    return list;
  }

  renderNavItem(child, index) {
    let onSelect = chain(child.props.onSelect, this.props.onSelect);
    let isActive = this.isChildActive(child);
    let tabProps = this.getTabProps(child, index, isActive, onSelect);

    return cloneElement(
      child,
      {
        key: child.key ? child.key : index,
        role: this.props.bsStyle === 'tabs' ? 'tab' : null,
        active: isActive,
        onSelect,
        ...tabProps
      }
    );
  }

  getActiveKey(props = this.props, context = this.context) {
    let activeKey = props.activeKey;

    if (context.$bs_tabcontainer) {
      warning(activeKey == null || props.activeHref,
        'Specifing a Nav `activeKey` or `activeHref` prop in the context of a `TabContainer` is not supported. ' +
        'Instead use `<TabContainer activeKey={' + activeKey + '} />`');

      activeKey = context.$bs_tabcontainer_activeKey;
    }
    return activeKey;
  }

  isChildActive(child) {
    let activeKey = this.getActiveKey();

    if (this.context.$bs_tabcontainer) {
      warning(!child.props.active,
        'Specifing a NavItem `active` prop in the context of a `TabContainer` is not supported. Instead ' +
        'use `<TabContainer activeKey={' + child.props.eventKey + '} />`');

      return child.props.eventKey === activeKey;
    }

    if (child.props.active) {
      return true;
    }
    if (this.props.activeKey != null) {
      if (child.props.eventKey === this.props.activeKey) {
        return true;
      }
    }
    if (this.props.activeHref != null) {
      if (child.props.href === this.props.activeHref) {
        return true;
      }
    }

    return child.props.active;
  }

  getTabProps(child, idx, isActive, onSelect) {
    let { onKeyDown, eventKey, tabIndex = 0 } = child.props;
    let context = this.context;

    if (!context.$bs_tabcontainer) {
      return {};
    }

    let ids = context.$bs_tabcontainer_idMap;
    onSelect = chain(onSelect, context.$bs_tabcontainer_onSelect);

    return {
      onSelect,
      role: 'tab',
      tabIndex: isActive ? tabIndex : -1,
      linkId: ids.tabs.get(eventKey),
      'aria-controls': ids.panes.get(eventKey),
      onKeyDown: chain(
        this.handleTabKeyDown.bind(this, onSelect || (()=>{})),
        onKeyDown
      )
    };
  }

  handleTabKeyDown(onSelect, event) {
    let keys = this.eventKeys();
    let currentKey = this.getActiveKey() || keys[0];
    let next;

    switch (event.keyCode) {

    case keycode.codes.left:
    case keycode.codes.up:
      next = tabUtils.nextEnabled(this.props.children, currentKey, keys, false);

      if (next && next !== currentKey) {
        event.preventDefault();
        onSelect(next);
        this._needsRefocus = true;
      }
      break;
    case keycode.codes.right:
    case keycode.codes.down:
      next = tabUtils.nextEnabled(this.props.children, currentKey, keys, true);

      if (next && next !== currentKey) {
        event.preventDefault();
        onSelect(next);
        this._needsRefocus = true;
      }
      break;
    default:
    }
  }

  eventKeys() {
    let keys = [];
    ValidComponentChildren.forEach(this.props.children,
      ({props: { eventKey }}) => keys.push(eventKey));
    return keys;
  }

  setIds(props, context) {
    if (context.$bs_tabcontainer) {
      let map = context.$bs_tabcontainer_idMap;

      ValidComponentChildren.forEach(props.children, (child) => {
        map.set('tabs',
          child.props.eventKey,
          tabUtils.getTabId(child.props, map.id)
        );
      });
    }
  }
}

Nav.propTypes = {
  activeHref: React.PropTypes.string,
  activeKey: React.PropTypes.any,

  stacked: React.PropTypes.bool,
  justified: all(
    React.PropTypes.bool,
    ({justified, navbar}) => (
      justified && navbar ?
        Error('justified navbar `Nav`s are not supported') : null
    )
  ),
  onSelect: React.PropTypes.func,

  /**
   * CSS classes for the wrapper `nav` element
   */
  className: React.PropTypes.string,
  /**
   * HTML id for the wrapper `nav` element
   */
  id: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.number
  ]),
  /**
   * CSS classes for the inner `ul` element
   *
   * @deprecated
   */
  ulClassName: deprecated(React.PropTypes.string,
    'The wrapping `<nav>` has been removed you can use `className` now'),
  /**
   * HTML id for the inner `ul` element
   *
   * @deprecated
   */

  ulId: deprecated(React.PropTypes.string,
    'The wrapping `<nav>` has been removed you can use `id` now'),

  /**
   * Apply styling an alignment for use in a Navbar. This prop will be set
   * automatically when the Nav is used inside a Navbar.
   */
  navbar: React.PropTypes.bool,
  eventKey: React.PropTypes.any,
  pullRight: React.PropTypes.bool,
  pullLeft: React.PropTypes.bool,

  right: deprecated(React.PropTypes.bool,
    'Use the `pullRight` prop instead'),

  /**
   * @private
   */
  expanded: React.PropTypes.bool,

  /**
   * @private
   */
  collapsible: deprecated(React.PropTypes.bool,
    'Use `Navbar.Collapse` instead, to create collapsible Navbars'),
};

Nav.contextTypes = {
  $bs_navbar: React.PropTypes.bool,
  $bs_navbar_bsClass: React.PropTypes.string,
  $bs_deprecated_navbar: React.PropTypes.bool,

  $bs_tabcontainer: React.PropTypes.bool,
  $bs_tabcontainer_activeKey: React.PropTypes.any,
  $bs_tabcontainer_onSelect: React.PropTypes.func,
  $bs_tabcontainer_idMap: React.PropTypes.shape({
    set: React.PropTypes.func,
    panes: React.PropTypes.object,
    tabs: React.PropTypes.object,
  })
};

Nav.defaultProps = {
  justified: false,
  pullRight: false,
  pullLeft: false,
  stacked: false
};

export default _bsClass('nav',
  bsStyles(['tabs', 'pills'],
    Nav
  )
);
