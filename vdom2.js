let id = 0;

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

function _init(obj) {
  this.isComponent = !obj.element;
  this._components = getComponents.call(this, obj.components);
  if (!this.isComponent) this._node = new vNode(document.getElementById(obj.element), this);
}

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
}
