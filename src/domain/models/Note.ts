import { 
    NoteId, 
    Position, 
    Dimensions, 
    NoteInstance, 
    NoteData 
} from '../../core/types';

export class Note implements NoteInstance {
  readonly id: NoteId;
  text: string;
  position: Position;
  dimensions: Dimensions;
  
  constructor(
    id: NoteId,
    position: Position,
    text: string = '',
    dimensions: Dimensions = { width: 200, height: 100 }
  ) {
    this.id = id;
    this.text = text;
    this.position = position;
    this.dimensions = dimensions;
  }
  
  getData(): NoteData {
    return Object.freeze({
      id: this.id,
      text: this.text,
      position: { ...this.position },
      dimensions: { ...this.dimensions }
    });
  }
  
  clone(): Note {
    return new Note(
      this.id,
      { ...this.position },
      this.text,
      { ...this.dimensions }
    );
  }
}