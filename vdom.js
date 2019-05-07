const log = console.dir;

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
  if (component) return htmlToElement(component.template);
  return element;
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
  console.log(attribute.name.substring(2), this);
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
    this.oldElement = getComponentOrElement.call(instance, element);
    this.instance = instance;
    this.name = element.nodeName;
    this.childNodes = Array.from(this.oldElement.childNodes).map(element => new vNode(element, instance));
  }

  render() {
    this.newElement = makeElement(this.oldElement);
    addAttributes.call(this.instance, this.newElement, this.oldElement.attributes);
    this.childNodes.forEach(child => this.newElement.appendChild(child.render()))
    return this.newElement;
  }
}

class Binding {
  constructor(obj) {
    this._components = obj.components;
    this._node = new vNode(document.getElementById(obj.element), this);
    document.getElementById(obj.element).parentElement.replaceChild(this._node.render(), document.getElementById(obj.element));
  }
  $mapping = {}
}
