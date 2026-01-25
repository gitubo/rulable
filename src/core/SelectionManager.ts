/**
 * [cite_start]Manages the selection state of graph elements[cite: 335].
 */
import { EventBus } from './EventBus';
import { Selection, NodeId, ConnectionId, NoteId } from './types';

export class SelectionManager {
  private selection: Selection | null = null;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }
  
  // ========== QUERIES ==========
  
  getSelection(): Readonly<Selection> | null {
    return this.selection ? { ...this.selection } : null;
  }
  
  isSelected(type: 'node' | 'link' | 'note', id: string): boolean {
    return this.selection?.type === type && this.selection?.id === id;
  }
  
  hasSelection(): boolean {
    return this.selection !== null;
  }
  
  // ========== COMMANDS ==========
  
  selectNode(id: NodeId): void {
    this.setSelection({ type: 'node', id });
  }
  
  selectLink(id: ConnectionId): void {
    this.setSelection({ type: 'link', id });
  }
  
  selectNote(id: NoteId): void {
    this.setSelection({ type: 'note', id });
  }
  
  clearSelection(): void {
    if (this.selection === null) return;
    
    this.selection = null;
    this.eventBus.emit('SELECTION_CHANGED', null);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  private setSelection(selection: Selection): void {
    // Don't emit if selection hasn't changed
    if (this.selection?.type === selection.type && this.selection?.id === selection.id) {
      return;
    }
    
    this.selection = selection;
    this.eventBus.emit('SELECTION_CHANGED', selection);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  // Auto-clear selection when items are removed
  handleNodeRemoved(nodeId: NodeId): void {
    if (this.selection?.type === 'node' && this.selection?.id === nodeId) {
      this.clearSelection();
    }
  }
  
  handleLinkRemoved(linkId: ConnectionId): void {
    if (this.selection?.type === 'link' && this.selection?.id === linkId) {
      this.clearSelection();
    }
  }
  
  handleNoteRemoved(noteId: NoteId): void {
    if (this.selection?.type === 'note' && this.selection?.id === noteId) {
      this.clearSelection();
    }
  }
}