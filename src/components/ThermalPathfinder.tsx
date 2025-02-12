'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ThermalPathfinder = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('Please select a valid image file');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageSrc(result);
        setError(null);
      }
    };
    reader.onerror = () => setError('Error reading file');
    reader.readAsDataURL(file);
  };

  const isGreen = (imageData: ImageData, x: number, y: number): boolean => {
    const index = (y * imageData.width + x) * 4;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    return g > r && g > b;
  };

  const getDirection = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.atan2(dy, dx);
  };

  const findPath = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !startPoint || !endPoint) {
      setError('Missing required elements for pathfinding');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context');
      return;
    }

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Reset canvas
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const visited = new Set<string>();
      const queue = [[startPoint]];
      
      while (queue.length > 0) {
        const currentPath = queue.shift();
        if (!currentPath) continue;
        
        const current = currentPath[currentPath.length - 1];
        
        if (Math.abs(current.x - endPoint.x) < 10 && Math.abs(current.y - endPoint.y) < 10) {
          // Draw the path
          ctx.beginPath();
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 4;
          
          let prevDirection: number | null = null;
          
          currentPath.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              const currentDirection = getDirection(currentPath[index - 1], point);
              
              ctx.lineTo(point.x, point.y);
              
              if (prevDirection !== null && 
                  (Math.abs(currentDirection - prevDirection) > 0.1 || index === currentPath.length - 1)) {
                ctx.stroke();
                ctx.beginPath();
                ctx.fillStyle = 'yellow';
                ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.strokeStyle = 'red';
                ctx.moveTo(point.x, point.y);
              }
              
              prevDirection = currentDirection;
            }
          });
          
          ctx.stroke();
          
          // Draw start and end points
          ctx.fillStyle = 'blue';
          ctx.beginPath();
          ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI);
          ctx.arc(endPoint.x, endPoint.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          return;
        }

        const directions = [
          { dx: 0, dy: 10 },
          { dx: 10, dy: 0 },
          { dx: 0, dy: -10 },
          { dx: -10, dy: 0 },
          { dx: 7, dy: 7 },
          { dx: -7, dy: 7 },
          { dx: 7, dy: -7 },
          { dx: -7, dy: -7 }
        ];

        for (const { dx, dy } of directions) {
          const newX = Math.floor(current.x + dx);
          const newY = Math.floor(current.y + dy);
          
          if (newX < 0 || newX >= canvas.width || newY < 0 || newY >= canvas.height) continue;
          
          const key = `${newX},${newY}`;
          if (visited.has(key)) continue;
          
          if (isGreen(imageData, newX, newY)) {
            visited.add(key);
            const newPath = [...currentPath, { x: newX, y: newY }];
            queue.push(newPath);
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(newX - 2, newY - 2, 4, 4);
          }
        }
      }
    } catch (err) {
      setError(`Error finding path: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    if (!startPoint) {
      setStartPoint({ x, y });
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    } else if (!endPoint) {
      setEndPoint({ x, y });
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      const image = imageRef.current;
      if (!image) return;
      
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      setStartPoint({ x, y });
      setEndPoint(null);
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  useEffect(() => {
    if (imageSrc) {
      const image = new Image();
      image.src = imageSrc;
      imageRef.current = image;
      
      image.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Could not get canvas context');
          return;
        }
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };

      image.onerror = () => setError('Error loading image');
    }
  }, [imageSrc]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Thermal Image Pathfinder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="border border-gray-200 cursor-crosshair"
          />
          <div className="space-y-2">
            <Button 
              onClick={findPath}
              disabled={!startPoint || !endPoint}
              className="bg-blue-500 text-white"
            >
              Find Path
            </Button>
            <div className="text-sm text-gray-600">
              {!startPoint && 'Click to set start point'}
              {startPoint && !endPoint && 'Click to set end point'}
              {startPoint && endPoint && 'Click "Find Path" to calculate route'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThermalPathfinder;