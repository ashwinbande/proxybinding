let id = 0;
let dep = null;

function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

function getValue(path) {
  const arrayPath = path.split('.');
  return arrayPath.reduce((acc, str) => acc ? acc[str] : acc, this);
}

function setValue(path, value) {
  const arrayPath = path.split('.');
  const last = arrayPath.pop();
  const obj = arrayPath.reduce((acc, str) => acc ? acc[str] : acc, this);
  obj[last] = value;
}

function getPath(path, prop) {
  if (path) return `${path}.${prop}`;
  return prop;
}

function htmlToElement(html) {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function getComponentOrElement(element) {
  const component = this._components.find(comp => comp.name.toUpperCase() === element.tagName);
  if (component) return [htmlToElement(component.template), new Binding(component, this)];
  return [element, this];
}

function makeElement(element) {
  if (element.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(element.nodeValue);
  }
  return document.createElement(element.tagName);
}

function processModelDirective(element, value) {
  if (this.$mapping[value]) this.$mapping[value].push(element);
  else this.$mapping[value] = [element];
  element.addEventListener('input', event => setValue.call(this, value, event.target.value));
  element.value = getValue.call(this, value);
}

function processAttr(element, attribute) {
  if (attribute.name.substring(2) === 'model') processModelDirective.call(this, element, attribute.value)
}

function addAttributes(element, attributes) {
  if (attributes) {
    for (let i = 0; i < attributes.length; i++) {
      const attrib = attributes[i];
      if (attrib.name.startsWith('b-')) {
        // TODO: Binding attr
        processAttr.call(this, element, attrib)
      } else {
        element.setAttribute(attrib.name, attrib.value);
      }
    }
  }
}

class vNode{
  constructor(element, instance) {
    // todo: set props of componant
    this.props = element;
    [this.oldElement, this.instance] = getComponentOrElement.call(instance, element);
    this.childNodes = Array.from(this.oldElement.childNodes).map(element => new vNode(element, this.instance));
  }
  render() {
    this.newElement = makeElement(this.oldElement);
    addAttributes.call(this.instance, this.newElement, this.oldElement.attributes);
    this.childNodes.forEach(child => this.newElement.appendChild(child.render()));
    return this.newElement;
  }
}

function getComponents(components) {
  if (this.$parent) return [...this.$parent._components, ...(components || [])];
  return components || [];
}

function propagateChange(path, newValue) {
  if (this.$mapping[path]) this.$mapping[path].forEach(element => element.value = newValue);
}

function executeWatch(path, newVal, oldVal) {
  if (this.$watch[path]) {
    this.$watch[path].call(this, newVal, oldVal);
  }
}

function changeComputed(path) {
  for (let computedProp in this.$dependencies) {
    if (this.$dependencies[computedProp].has(path)) {
      const oldVal = this.$cache[computedProp];
      this.$cache[computedProp] = undefined;
      const newVal = this[computedProp];
      propagateChange.call(this, computedProp, newVal);
      changeComputed.call(this, computedProp);
      executeWatch.call(this, computedProp, newVal, oldVal);
    }
  }
}

function setData(target, object, self, path) {
  for (let prop in object) {
    Object.defineProperty(target, prop, {
      get() {
        if (isObject(object[prop])) return setData({}, object[prop], self, getPath(path, prop));
        else {
          if (dep) self.$dependencies[dep].add(getPath(path, prop));
          return object[prop];
        }
      },
      set(newVal) {
        const oldVal = object[prop];
        object[prop] = newVal;
        propagateChange.call(self, getPath(path, prop), newVal);
        changeComputed.call(self, getPath(path, prop));
        executeWatch.call(self, getPath(path, prop), newVal, oldVal);
      },
    });
  }
  return target;
}

function setComputed(target, object) {
  for (let prop in object) {
    target.$dependencies[prop] = new Set();
    Object.defineProperty(target, prop, {
      get() {
        if (dep) target.$dependencies[dep].add(prop);
        if (target.$cache[prop]) return target.$cache[prop];
        if (!dep) dep = prop;
        const func = object[prop].get || object[prop];
        target.$cache[prop] = func.call(target);
        dep = null;
        return target.$cache[prop]
      },
      set(val) {
        const func = object[prop].set;
        if (func) {
          func.call(target, val);
          target.$cache[prop] = undefined;
        }
      },
    });
  }
}

function _init(obj) {
  this.isComponent = !obj.element;
  this._components = getComponents.call(this, obj.components);
  setData(this, obj.data, this);
  setComputed(this, obj.computed);
  this.$watch = obj.watch || {};
  if (!this.isComponent) this._node = new vNode(document.getElementById(obj.element), this);
}

// get attributes as constructor argument and then set props
class Binding {
  constructor(obj, parent) {
    id++;
    this.id = id;

    this.$parent = parent;
    _init.call(this, obj);
    if (!this.isComponent) {
      const parent = document.getElementById(obj.element).parentElement;
      parent.replaceChild(this._node.render(), document.getElementById(obj.element));
    }
  }
  $mapping = {};
  $dependencies = {};
  $cache = {};
}
