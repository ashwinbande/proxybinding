
function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

function getPath(path, prop) {
  if (path) return `${path}.${prop}`;
  return prop;
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

function htmlToElement(html) {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function processAttr(attr, bClass) {
  console.log(bClass);
  if (attr.name.startsWith('b-')) {
    const directiveName = attr.name.substring(2);
    if (directiveName === 'model') {
      attr.ownerElement.addEventListener('input', (event) => {
        setValue.call(bClass, attr.value, event.target.value);
      });
    }
    const directive = this.$directives.find(dir => dir.match(attr.name.substring(2)));
    if (directive) {
      const obj = {
        element: attr.ownerElement,
        func: directive.func
      };
      if (this.$dependies[attr.value]) this.$dependies[attr.value].push(obj);
      else this.$dependies[attr.value] = [obj];
      directive.func(attr.ownerElement, getValue.call(bClass, attr.value), attr.value);
    }
  }
}

class vNode {
  constructor(element, obj, comp, bClass) {
    this.element = element;
    this.object = obj;
    this.comp = comp;
    this.bClass = bClass;
    if (comp) {
      this.render()
    } else {
      this.htmlElement = this.element;
    }
    Array.from(element.attributes).forEach(attr => processAttr.call(bClass, attr, comp || bClass));
    this.setChildren()
  }
  children = [];
  render = () => {
    this.htmlElement = htmlToElement(this.comp.template);
    this.element.parentElement.replaceChild(this.htmlElement, this.element);
  };

  setChildren = () => {
    makeNodeTree(this.htmlElement, this.bClass.$components, this, this.bClass);
  };

  addChild = (element, obj, comp, bClass) => this.children.push( new vNode(element, obj, comp, bClass));
}

function isComponent(tagName, components) {
  return components.find(comp => comp.name === tagName);
}

function makeNodeTree(element, components, node, bClass) {
  Array.from(element.children).forEach(child => {
      node.addChild(child, component, isComponent(child.tagName.toLowerCase(), components), bClass)
  });
}

function propagateChange(path, newValue) {
  const array = this.$dependies[path];
  if (array) {
    array.forEach(obj => obj.func.call(this, obj.element, newValue, path));
  }
  // if (this.$bindings[path]) this.$bindings[path].forEach(element => element.value = newValue);
}

function setData(target, object, self, path) {
  for (let prop in object) {
    Object.defineProperty(target, prop, {
      get() {
        if (isObject(object[prop])) return setData({}, object[prop], self, getPath(path, prop));
        else {
          // if (dep) self.$dependencies[dep].add(getPath(path, prop));
          return object[prop];
        }
      },
      set(newVal) {
        const oldVal = object[prop];
        object[prop] = newVal;
        propagateChange.call(self, getPath(path, prop), newVal);
        // changeComputed.call(self, getPath(path, prop));
        // executeWatch.call(self, getPath(path, prop), newVal, oldVal);
      },
    });
  }
  return target;
}

class Directive{
  constructor(name, func) {
    this.name = name;
    this.func = func;
  }
  match = (str) => {
    return str === this.name;
  };
}

function addDirectives() {
  const model = new Directive('model', (element, value, path) => {
    element.value = value;
  });
  this.$directives.push(model)
}

class Binding {
  constructor(obj) {
    addDirectives.call(this);
    this.$element = document.getElementById(obj.element);
    this.$components = obj.components;
    setData(this, obj.data, this);
    this.$nodeTree = new vNode(this.$element, obj, obj.element.innerHTML, this);

  }
  $dependies = {};
  $directives = []

}
