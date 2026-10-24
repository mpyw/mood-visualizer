import { describe, expect, it, vi } from 'vitest'
import { downloadUrl } from './download'

describe('downloadUrl', () => {
  it('clicks a temporary download link', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.isConnected).toBe(true)
        expect(this.download).toBe('chart.png')
        expect(this.href).toBe('data:image/png;base64,AAAA')
      })
    downloadUrl('data:image/png;base64,AAAA', 'chart.png')
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a')).toBeNull()
  })
})
