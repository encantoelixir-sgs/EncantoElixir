# Encanto Elixir - v2 Firestore + imágenes en assets

Esta versión NO usa Firebase Storage, así evitamos activar facturación.

## Cómo funciona
- GitHub Pages aloja la página y la carpeta `assets`.
- Firestore guarda nombre, precio, categoría, detalles y ruta de imagen.
- Las imágenes se suben manualmente a la carpeta `assets` del repositorio.

En el panel admin, en `Imagen en assets`, escribe por ejemplo:

```txt
assets/212-men.jpg
```

## Se sincroniza PC ↔ celular
Sí se sincroniza:
- nombre
- precio
- categoría
- detalles
- ruta de imagen

La imagen como archivo NO se sube desde el panel; debes subirla a GitHub en `assets`.

## Firebase necesario
- Authentication
- Firestore

No necesitas Firebase Storage.

## Reglas de Firestore

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /perfumes/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
