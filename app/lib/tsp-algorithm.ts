
/**
 * Implementación del algoritmo de Vecino Más Cercano para optimizar rutas de cobranza.
 * Resuelve el Problema del Viajante (TSP) de forma heurística y eficiente.
 */

interface Point {
  id: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

/**
 * Calcula la distancia en línea recta entre dos puntos (Euclidiana simple).
 * Para distancias cortas urbanas es suficiente y más rápido que Haversine.
 */
function calculateDistance(p1: Point, p2: Point): number {
  const dx = p1.lat - p2.lat;
  const dy = p1.lng - p2.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Ordena una lista de puntos para crear la ruta más corta posible 
 * partiendo de una ubicación inicial.
 */
export function optimizeRoute(startPoint: Point, points: Point[]): Point[] {
  if (points.length <= 1) return points;

  const result: Point[] = [];
  const unvisited = [...points];
  let currentPoint = startPoint;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(currentPoint, unvisited[0]);

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentPoint, unvisited[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
    result.push(nearestPoint);
    currentPoint = nearestPoint;
  }

  return result;
}
