# Publicación en Packagist

## Estado preparado

Nombre Composer: `edwin-ortizp/laravel-markdown`. Licencia MIT.
Primera etiqueta prevista: `v0.1.0`. Repositorio:
https://github.com/edwin-ortizp/laravel-markdown

La preparación local no implica que Packagist tenga ya una versión disponible.
No se cambia el namespace PHP `Edwin\LaravelMarkdown` ni los aliases Blade/JS.

## Publicar (requiere autorización de commit y push)

1. Revisar `git diff`, ejecutar `composer validate --strict` y las pruebas aisladas
   descritas en VALIDATION.md. Revisar también LICENSE, README y el estado de Git.
2. Crear el commit de preparación y publicar la rama; crear y publicar la etiqueta
   anotada `v0.1.0` sobre ese mismo commit. No etiquetar el commit inicial antiguo.
3. Iniciar sesión en https://packagist.org con la cuenta mantenedora y enviar
   https://github.com/edwin-ortizp/laravel-markdown mediante Submit.
4. Verificar que Packagist identifica el nombre correcto y la etiqueta 0.1.0.
   Conectar GitHub a la cuenta y comprobar que está habilitada la sincronización
   automática. Si no lo está, configurar el webhook conforme a
   https://packagist.org/about#how-to-update-packages.
5. En un directorio temporal, sin repositorios path/VCS personalizados, instalar
   `composer require edwin-ortizp/laravel-markdown:0.1.0` y comprobar su origen y licencia.

## Adoptar la versión pública

Solo después de verificar su instalación desde Packagist:

- En Gesthor, MiSo y QuizLab, por separado, retirar el require antiguo
  `edwin/laravel-markdown` y el repositorio path correspondiente; requerir
  `edwin-ortizp/laravel-markdown` con versión inicial exacta `0.1.0`.
- Actualizar únicamente los dos nombres de paquete con Composer; revisar que no
  cambien las versiones de otras dependencias y conservar el lock resultante.
- Publicar recursos y repetir la prueba Browser aislada de cada aplicación antes
  de continuar con la siguiente. Conservar copia del manifiesto/lock anterior.
- Actualizar las referencias documentales al nombre antiguo dentro de cada app.
- No introducir SQL ni conversiones de contenido. CertMind mantiene CKEditor.

Los consumidores actuales conservan sus copias del paquete antiguo y funcionan
independientemente de estos cambios en la fuente. No ejecutar `composer reinstall`
con el nombre antiguo contra la fuente renombrada: el nombre ya no coincide.

## Desarrollo local posterior

El repositorio path usa el nombre nuevo, `options.symlink: false` y una versión
inferida de Git. Antes de la primera etiqueta, puede declararse temporalmente
`options.versions: {"edwin-ortizp/laravel-markdown": "0.1.0"}` en el proyecto de
prueba. Este override no publica una versión y no debe pasar a producción.

## Revertir una adopción

Restaurar solo el cambio de dependencia y el lock de esa aplicación, ejecutar
composer install y volver a publicar los recursos de la versión anterior.
La reversión no requiere modificar datos. No restaurar cambios ajenos del proyecto.
