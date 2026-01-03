# Análise do Problema do Backdrop

## Descobertas

1. **O backdrop ESTÁ sendo renderizado** - A imagem está carregada (naturalWidth > 0)
2. **A imagem está em**: https://www.onnplay.com/overlays/christmas-lights.jpg
3. **O problema**: O BackdropFrame está sendo renderizado FORA do container do monitor!

### Estrutura atual:
```
flex-1 flex flex-col max-w-[45%]  (container do monitor)
  └── rounded-lg overflow-hidden w-full  (wrapper)
        └── pointer-events-none z-index:1  (BackdropFrame) ❌ ERRADO!
```

### Estrutura esperada:
```
flex-1 flex flex-col max-w-[45%]  (container do monitor)
  └── rounded-lg overflow-hidden w-full  (wrapper com aspect-ratio 16/9)
        └── div relative (container interno)
              ├── BackdropFrame z-index:1
              ├── Conteúdo (vídeo) z-index:15
              └── OverlayFrame z-index:30
```

## Problema Identificado

O BackdropFrame está sendo renderizado como filho direto do wrapper, mas o wrapper não tem `position: relative`, então o `position: absolute` do BackdropFrame não está funcionando corretamente.

## Solução

Garantir que o container interno do monitor tenha `position: relative` e que o BackdropFrame seja filho desse container.
