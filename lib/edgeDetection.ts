import { RoofEdge, EdgeType } from '../types';

interface Point {
  lat: number;
  lng: number;
}

interface DetectionResult {
  edgeType: EdgeType;
  confidenceScore: number;
  detectionReason: string;
}

export const calculateAngleBetweenEdges = (edge1Points: Point[], edge2Points: Point[]): number => {
  const getVector = (p1: Point, p2: Point) => ({
    x: p2.lng - p1.lng,
    y: p2.lat - p1.lat
  });

  const v1 = getVector(edge1Points[0], edge1Points[edge1Points.length - 1]);
  const v2 = getVector(edge2Points[0], edge2Points[edge2Points.length - 1]);

  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  const cosAngle = dotProduct / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  return angle;
};

export const calculateEdgeAngleToNorth = (points: Point[]): number => {
  if (points.length < 2) return 0;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  const dx = endPoint.lng - startPoint.lng;
  const dy = endPoint.lat - startPoint.lat;

  let angle = Math.atan2(dx, dy) * (180 / Math.PI);

  if (angle < 0) angle += 360;

  return angle;
};

export const calculateEdgeLength = (points: Point[]): number => {
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const R = 6371e3;
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalLength += R * c;
  }

  return totalLength * 3.28084;
};

export const isEdgeNearlyHorizontal = (angle: number, tolerance: number = 15): boolean => {
  const normalizedAngle = angle % 180;
  return normalizedAngle < tolerance || normalizedAngle > (180 - tolerance);
};

export const isEdgeNearlyVertical = (angle: number, tolerance: number = 15): boolean => {
  const normalizedAngle = (angle + 90) % 180;
  return normalizedAngle < tolerance || normalizedAngle > (180 - tolerance);
};

export const findConnectingEdges = (
  edge: RoofEdge,
  allEdges: RoofEdge[],
  tolerance: number = 0.00001
): string[] => {
  const connectingEdges: string[] = [];

  const edgeStartPoint = edge.geometry[0];
  const edgeEndPoint = edge.geometry[edge.geometry.length - 1];

  allEdges.forEach(otherEdge => {
    if (otherEdge.id === edge.id) return;

    const otherStart = otherEdge.geometry[0];
    const otherEnd = otherEdge.geometry[otherEdge.geometry.length - 1];

    const isConnected =
      (Math.abs(edgeStartPoint.lat - otherStart.lat) < tolerance &&
       Math.abs(edgeStartPoint.lng - otherStart.lng) < tolerance) ||
      (Math.abs(edgeStartPoint.lat - otherEnd.lat) < tolerance &&
       Math.abs(edgeStartPoint.lng - otherEnd.lng) < tolerance) ||
      (Math.abs(edgeEndPoint.lat - otherStart.lat) < tolerance &&
       Math.abs(edgeEndPoint.lng - otherStart.lng) < tolerance) ||
      (Math.abs(edgeEndPoint.lat - otherEnd.lat) < tolerance &&
       Math.abs(edgeEndPoint.lng - otherEnd.lng) < tolerance);

    if (isConnected) {
      connectingEdges.push(otherEdge.id);
    }
  });

  return connectingEdges;
};

export const detectEdgeType = (
  edge: RoofEdge,
  allEdges: RoofEdge[]
): DetectionResult => {
  const angle = calculateEdgeAngleToNorth(edge.geometry);
  const connectingEdges = findConnectingEdges(edge, allEdges);
  const connectionCount = connectingEdges.length;

  let confidenceScore = 0;
  let edgeType: EdgeType = 'Unlabeled';
  let detectionReason = '';

  if (isEdgeNearlyHorizontal(angle, 15)) {
    if (connectionCount >= 2 && edge.elevationRank === 1) {
      edgeType = 'Ridge';
      confidenceScore = 95;
      detectionReason = `Horizontal (${Math.round(angle)}°), highest elevation, connects ${connectionCount} edges`;
    } else if (connectionCount === 2) {
      edgeType = 'Ridge';
      confidenceScore = 75;
      detectionReason = `Horizontal (${Math.round(angle)}°), connects 2 edges`;
    } else if (connectionCount === 1) {
      edgeType = 'Eave';
      confidenceScore = 70;
      detectionReason = `Horizontal (${Math.round(angle)}°), perimeter edge`;
    } else {
      edgeType = 'Eave';
      confidenceScore = 65;
      detectionReason = `Horizontal (${Math.round(angle)}°), likely perimeter`;
    }
  } else if (connectionCount >= 3) {
    const connectingAngles = connectingEdges.map(connId => {
      const connEdge = allEdges.find(e => e.id === connId);
      if (!connEdge) return 0;
      return calculateAngleBetweenEdges(edge.geometry, connEdge.geometry);
    });

    const avgAngle = connectingAngles.reduce((a, b) => a + b, 0) / connectingAngles.length;

    if (avgAngle < 100) {
      edgeType = 'Valley';
      confidenceScore = 92;
      detectionReason = `Internal angle ${Math.round(avgAngle)}°, connects ${connectionCount} edges`;
    } else if (avgAngle > 130 && avgAngle < 160) {
      edgeType = 'Hip';
      confidenceScore = 90;
      detectionReason = `External angle ${Math.round(avgAngle)}°, connects ${connectionCount} edges`;
    } else {
      edgeType = 'Ridge';
      confidenceScore = 70;
      detectionReason = `Connects ${connectionCount} edges at ${Math.round(avgAngle)}°`;
    }
  } else if (connectionCount === 2) {
    const connEdge1 = allEdges.find(e => e.id === connectingEdges[0]);
    const connEdge2 = allEdges.find(e => e.id === connectingEdges[1]);

    if (connEdge1 && connEdge2) {
      const angle1 = calculateAngleBetweenEdges(edge.geometry, connEdge1.geometry);
      const angle2 = calculateAngleBetweenEdges(edge.geometry, connEdge2.geometry);
      const avgAngle = (angle1 + angle2) / 2;

      if (avgAngle < 100) {
        edgeType = 'Valley';
        confidenceScore = 88;
        detectionReason = `Internal angle ${Math.round(avgAngle)}°, forms V-shape`;
      } else if (avgAngle > 130) {
        edgeType = 'Hip';
        confidenceScore = 85;
        detectionReason = `External angle ${Math.round(avgAngle)}°, connects peak to eave`;
      } else {
        edgeType = 'Ridge';
        confidenceScore = 65;
        detectionReason = `Diagonal connection at ${Math.round(avgAngle)}°`;
      }
    }
  } else if (connectionCount === 1) {
    if (isEdgeNearlyVertical(angle, 20)) {
      edgeType = 'Rake';
      confidenceScore = 80;
      detectionReason = `Sloped edge (${Math.round(angle)}°), gable end`;
    } else {
      edgeType = 'Eave';
      confidenceScore = 60;
      detectionReason = `Perimeter edge with one connection`;
    }
  } else {
    if (edge.lengthFt < 10) {
      edgeType = 'Penetration';
      confidenceScore = 70;
      detectionReason = `Small isolated feature (${Math.round(edge.lengthFt)}ft)`;
    } else {
      edgeType = 'Unlabeled';
      confidenceScore = 30;
      detectionReason = 'Insufficient geometric information';
    }
  }

  return {
    edgeType,
    confidenceScore,
    detectionReason
  };
};

export const autoDetectAllEdges = (edges: RoofEdge[]): RoofEdge[] => {
  const sortedEdges = [...edges].sort((a, b) =>
    (b.elevationRank || 0) - (a.elevationRank || 0)
  );

  return sortedEdges.map(edge => {
    if (edge.userModified) {
      return edge;
    }

    const detection = detectEdgeType(edge, sortedEdges);

    return {
      ...edge,
      edgeType: detection.edgeType,
      confidenceScore: detection.confidenceScore,
      detectionReason: detection.detectionReason,
      autoDetected: true,
      connectsTo: findConnectingEdges(edge, sortedEdges)
    };
  });
};
