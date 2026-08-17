'use client'

import { create } from 'zustand'

/**
 * Les trois panneaux du constructeur que le dock mobile peut ouvrir.
 *
 * `library` n'est pas un tiroir distinct : c'est le tiroir Structure ouvert
 * directement sur la bibliothèque de blocs, parce que « Ajouter » est l'action
 * la plus fréquente quand on construit sa page depuis un téléphone.
 */
export type EditorPanel = 'structure' | 'settings' | 'library'

type EditorDockState = {
  /**
   * Fourni par l'éditeur pendant qu'il est à l'écran, `null` sinon.
   *
   * Le dock est monté par le gabarit du tableau de bord, donc bien au-dessus de
   * l'éditeur dans l'arbre : il ne peut pas recevoir ses fonctions en
   * propriétés. Ce registre laisse l'éditeur les publier au montage et les
   * retirer au démontage — hors de l'éditeur, `open` vaut `null` et le dock
   * reprend exactement sa navigation habituelle.
   */
  open: ((panel: EditorPanel) => void) | null
  register: (open: ((panel: EditorPanel) => void) | null) => void
}

export const useEditorDock = create<EditorDockState>((set) => ({
  open: null,
  register: (open) => set({ open }),
}))
