import { defineConfig, presetAttributify, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  shortcuts: [
    {
      key: 'border-1 border-dashed border-neutral-3 text-neutral rounded px-1 py-0.5 text-xs mx-1',
    },
    {
      'divider-v': 'min-h-10px h-full w-px bg-neutral-3 mx-2',
    },
    {
      button: 'flex items-center cursor-pointer border-gray-300 border-1 border-solid shadow rounded-md px-3 py-1 bg-zinc-900 hover:bg-gray-300 hover:text-zinc-900 transition-colors duration-200 select-none',
    },
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
