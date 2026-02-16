# 3D-Canvas

Practica de escena 3D interactiva hecha con **Three.js** y animaciones **FBX**.

## Caracteristicas

- Personaje 3D con animaciones: `idle`, `wave`, `dance`.
- Iluminacion de escena (ambient, directional y spotlight).
- Controles de camara con OrbitControls.
- Interacciones desde botones, teclado y clic sobre el personaje.

## Estructura principal

- `index.html`
- `src/app.js`
- `src/style.css`
- `assets/` (modelos y animaciones FBX/GLB)

## Como ejecutar

Como se usan modulos ES en el navegador, abre el proyecto con un servidor local.

Ejemplo con VS Code + Live Server, o con Python:

```bash
python -m http.server 5500
```

Luego abre:

```text
http://localhost:5500
```

## Controles

- Arrastrar: orbitar camara
- Rueda del mouse: zoom
- Botones de UI: cambiar animacion
- Teclas `1`, `2`, `3`: cambiar animacion
- Click en el personaje: `wave`

## Autor

Zaher171