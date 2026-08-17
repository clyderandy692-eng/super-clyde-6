'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Music2, Pause, Play } from 'lucide-react'

type Track = { title: string; mood: string; artist: string; license: string; source: string; audio: string }

const TRACKS: Track[] = [
  { title: 'Good Morning', mood: 'lo-fi trip-hop', artist: 'Moonwalk', license: 'CC BY 3.0', source: 'https://archive.org/details/jamendo-525340', audio: 'https://archive.org/download/jamendo-525340/01-2037687-Moonwalk-Good%20Morning%20_Lofi%20Trip-hop_.mp3' },
  { title: 'Relaxing Vibe', mood: 'lo-fi chill hop', artist: 'Janevo', license: 'CC BY-NC-ND 3.0', source: 'https://archive.org/details/jamendo-534497', audio: 'https://archive.org/download/jamendo-534497/01-2068725-Janevo-Relaxing%20Vibe%20_Lo-Fi%20Chill%20Hop_.mp3' },
]

const FIRST_TRACK_VOLUME = 0.1
const OTHER_TRACK_VOLUME = FIRST_TRACK_VOLUME * 0.294

function volumeForTrack(trackIndex: number) {
  return trackIndex === 0 ? FIRST_TRACK_VOLUME : OTHER_TRACK_VOLUME
}

function shuffledQueue() {
  const rest = TRACKS.map((_, index) => index).filter((index) => index !== 0)
  for (let index = rest.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[rest[index], rest[randomIndex]] = [rest[randomIndex], rest[index]]
  }
  return [0, ...rest]
}

export function LofiPlayer() {
  const pathname = usePathname()
  const autoplayRoutes = pathname === '/' || pathname === '/connexion' || pathname === '/inscription'
  /* Le lecteur vit sur les pages vitrines de CLYDE (accueil, connexion,
     inscription) — jamais dans les outils de travail : dans le dashboard et
     l'admin, il encombrait le coin bas-droit déjà occupé par les boutons
     flottants du constructeur. */
  const visible = autoplayRoutes
  const audioRef = useRef<HTMLAudioElement>(null)
  const queueRef = useRef<number[]>([0])
  const positionRef = useRef(0)
  const [mounted, setMounted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [queue, setQueue] = useState<number[]>([0])
  const [position, setPosition] = useState(0)
  const track = TRACKS[queue[position] ?? 0] ?? TRACKS[0]

  useEffect(() => {
    const initial = shuffledQueue()
    queueRef.current = initial
    setQueue(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!autoplayRoutes || !mounted) return
    const audio = audioRef.current
    if (!audio) return
    audio.muted = false
    audio.volume = volumeForTrack(queue[position] ?? 0)
    audio.src = track.audio
    audio.load()
    void audio.play().catch(() => setPlaying(false))
  }, [autoplayRoutes, mounted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!visible) {
      audio.pause()
      setPlaying(false)
      return
    }
    audio.volume = volumeForTrack(queue[position] ?? 0)
    audio.loop = false
  }, [visible, queue, position])

  function advanceTrack() {
    const next = positionRef.current + 1
    let nextQueue = queueRef.current
    let nextPosition = next
    if (next >= nextQueue.length) {
      nextQueue = shuffledQueue()
      queueRef.current = nextQueue
      nextPosition = 0
      setQueue(nextQueue)
    }
    positionRef.current = nextPosition
    setPosition(nextPosition)
    const nextTrack = TRACKS[nextQueue[nextPosition]]
    const audio = audioRef.current
    if (!audio || !nextTrack) return
    audio.src = nextTrack.audio
    audio.volume = volumeForTrack(nextQueue[nextPosition])
    audio.load()
    void audio.play().catch(() => setPlaying(false))
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    audio.src = track.audio
    audio.volume = volumeForTrack(queue[position] ?? 0)
    audio.load()
    void audio.play().catch(() => setPlaying(false))
  }

  if (!mounted || !visible) return null

  return (
    <>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={advanceTrack}
        onError={advanceTrack}
        aria-label="Lecteur de musique d’ambiance"
        className="sr-only"
      />
      <div className="fixed bottom-[6.5rem] right-3 z-[60] flex flex-col items-end gap-1.5 sm:bottom-6 sm:right-6">
        <div className="flex flex-col items-center gap-1 rounded-[1.15rem] border border-border/70 bg-card/80 p-1 shadow-[0_12px_40px_hsl(var(--foreground)/0.14)] backdrop-blur-xl">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Retourner en haut de la page" title="Retour en haut" className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={toggle} aria-label={playing ? 'Arrêter la musique' : 'Démarrer la musique'} title={playing ? 'Arrêter la musique' : 'Démarrer la musique'} className="flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
        <a href={track.source} target="_blank" rel="noreferrer" aria-label={`Source audio : ${track.title}, ${track.artist}, ${track.license}`} className="flex size-7 items-center justify-center rounded-full border border-border/60 bg-card/75 text-brand shadow-sm backdrop-blur-xl">
          <Music2 className="size-3" aria-hidden="true" />
          <span className="sr-only">Source : {track.title}</span>
        </a>
      </div>
    </>
  )
}
