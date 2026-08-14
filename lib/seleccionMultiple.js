export function contarSeleccion(lista) {
  return lista.reduce((acc, nombre) => {
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {});
}

export function agregarSeleccion(lista, nombre, max) {
  if (lista.length >= max) return lista;
  return [...lista, nombre];
}

export function quitarSeleccion(lista, nombre) {
  const index = lista.lastIndexOf(nombre);
  if (index === -1) return lista;
  return [...lista.slice(0, index), ...lista.slice(index + 1)];
}
