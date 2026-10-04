package com.goldos.app.wallpaper

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import com.goldos.app.R
import kotlin.math.max

/** Static-art live-wallpaper adapter: no polling, animation loop or market connection runs here. */
class GoldOsWallpaperService : WallpaperService() {
    override fun onCreateEngine(): Engine = GoldWallpaperEngine()

    private inner class GoldWallpaperEngine : Engine() {
        private var artwork: Bitmap? = null
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        init { setTouchEventsEnabled(false) }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            drawArtwork()
        }

        override fun onSurfaceRedrawNeeded(holder: SurfaceHolder) { drawArtwork() }

        override fun onVisibilityChanged(visible: Boolean) {
            if (visible) drawArtwork()
        }

        private fun drawArtwork() {
            if (!isVisible) return
            var canvas: Canvas? = null
            try {
                canvas = surfaceHolder.lockCanvas()
                if (canvas == null) return
                val bitmap = artwork ?: BitmapFactory.decodeResource(resources, R.drawable.gold_os_wallpaper)?.also { artwork = it }
                canvas.drawColor(Color.rgb(12, 10, 8))
                if (bitmap != null) {
                    val scale = max(canvas.width.toFloat() / bitmap.width, canvas.height.toFloat() / bitmap.height)
                    val width = bitmap.width * scale
                    val height = bitmap.height * scale
                    val destination = RectF((canvas.width - width) / 2f, (canvas.height - height) / 2f, (canvas.width + width) / 2f, (canvas.height + height) / 2f)
                    canvas.drawBitmap(bitmap, null, destination, paint)
                    canvas.drawRect(0f, 0f, canvas.width.toFloat(), canvas.height.toFloat(), Paint().apply { color = 0x220A0806 })
                }
            } catch (_: RuntimeException) {
                // A launcher may revoke the wallpaper surface during a screen transition.
            } finally {
                if (canvas != null) runCatching { surfaceHolder.unlockCanvasAndPost(canvas) }
            }
        }

        override fun onDestroy() {
            artwork?.recycle()
            artwork = null
            super.onDestroy()
        }
    }
}
