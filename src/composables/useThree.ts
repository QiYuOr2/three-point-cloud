import type { Ref } from 'vue'
import * as THREE from 'three'
import { onMounted, onUnmounted, ref } from 'vue'
import { useSafeWindowEventListener } from './useSafeEventListener'

interface UseThreeOptions {
  container: Ref<HTMLElement | null>
  onAnimate?: (three: Threes) => void
  showAxes?: boolean
}

export interface Threes {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export function useThree(options: UseThreeOptions) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer()

  if (options.showAxes) {
    scene.add(new THREE.AxesHelper(5))
  }

  const animations = new Set<(three: Threes) => void>()
  if (options.onAnimate) {
    animations.add(options.onAnimate)
  }

  const resizeThree = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const animationRef = ref<number>()
  const animate = () => {
    animationRef.value = requestAnimationFrame(animate)
    animations.forEach(animation => animation({ scene, camera, renderer }))
    renderer.render(scene, camera)
  }
  const onAnimate = (animation: (three: Threes) => void) => {
    animations.add(animation)
  }

  const removeSceneChildren = (type: string) => {
    let i = 0
    while (scene.children.length > i) {
      if (scene.children[i].type !== type) {
        i++
        continue
      }
      scene.remove(scene.children[i])
    }
  }

  useSafeWindowEventListener('resize', resizeThree)

  onMounted(() => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    options.container.value?.appendChild(renderer.domElement)
    camera.up.set(0, 0, 1)
    camera.position.set(0, -10, 5)

    animate()
  })

  onUnmounted(() => {
    options.container.value?.removeChild(renderer.domElement)
    cancelAnimationFrame(animationRef.value!)
  })

  const viewProjectionMatrix = new THREE.Matrix4()
  const frustum = new THREE.Frustum()

  onAnimate(() => {
    camera.updateMatrixWorld()
    viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(viewProjectionMatrix)
    scene.children.forEach((object) => {
      if (object.type === 'Points') {
        const isVisible = frustum.intersectsObject(object)
        object.userData.visible = isVisible
      }
    })
  })

  return { scene, camera, renderer, onAnimate, removeSceneChildren }
}
