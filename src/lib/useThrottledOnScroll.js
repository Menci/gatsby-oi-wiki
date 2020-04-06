import { useEffect, useMemo } from "react"
import throttle from "lodash/throttle"

const noop = () => {
}

export default function useThrottledOnScroll(callback, delay) {
  const throttledCallback = useMemo(
    () => (callback ? throttle(callback, delay) : noop),
    [callback, delay],
  )

  useEffect(() => {
    if (throttledCallback === noop) {
      return undefined
    }

    window.addEventListener("scroll", throttledCallback)
    return () => {
      window.removeEventListener("scroll", throttledCallback)
      throttledCallback.cancel()
    }
  }, [throttledCallback])
}
