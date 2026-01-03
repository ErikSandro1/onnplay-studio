# Análise do Problema de Overlays

## Problema Identificado

Na screenshot do usuário, a imagem (erik.11.webp) está aparecendo ATRÁS da moldura de Natal, quando deveria estar ENTRE o backdrop e a moldura.

## Estrutura Atual no DualMonitors.tsx

O código atual define:
- `BackdropFrame` com z-index: 1 (correto - atrás)
- Conteúdo (vídeo/imagem) com z-index: 10 inline no style
- `OverlayFrame` com z-index: 30 (correto - frente)

## Problema Real

O problema é que os elementos de conteúdo (vídeo, imagem, câmera) estão usando `position: relative` implícito ou não têm `position: absolute`, então o z-index não funciona corretamente.

Para z-index funcionar, os elementos precisam ter `position: absolute` ou `position: relative` explícito.

## Solução

1. Garantir que o container do conteúdo tenha `position: absolute` e `inset: 0`
2. Verificar que todos os elementos estejam no mesmo contexto de empilhamento
3. Ajustar a estrutura para garantir a ordem correta:
   - BackdropFrame (z-index: 1, position: absolute)
   - Conteúdo (z-index: 10, position: absolute)
   - OverlayFrame (z-index: 30, position: absolute)
