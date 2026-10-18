export type VenueId = 'dusk' | 'night' | 'day' | 'alpine';
export type Weather = 'dry' | 'wet';

export interface Venue {
  id: VenueId;
  name: string;
  note: string;
  /** Asphalt colour at the top and bottom of the road. */
  road: [string, string];
  /** Colour of the barrier hoardings' backing strip. */
  wall: string;
}

export const VENUES: Venue[] = [
  { id: 'dusk', name: 'Sunset Ring', note: 'Golden hour grand prix', road: ['#262330', '#17151f'], wall: '#1b1a24' },
  { id: 'night', name: 'Neon Harbour', note: 'Street circuit under lights', road: ['#1a1c25', '#101117'], wall: '#12131a' },
  { id: 'day', name: 'Dune International', note: 'Desert sun, long straights', road: ['#46454d', '#34333b'], wall: '#d9d6cf' },
  { id: 'alpine', name: 'Alpenring', note: 'Mountain valley, cool and grey', road: ['#353a43', '#262a31'], wall: '#9aa5b3' },
];

export function getVenue(id: VenueId): Venue {
  return VENUES.find((v) => v.id === id) ?? VENUES[0];
}