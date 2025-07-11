import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface AnomalyChartProps {
  data: Array<{
    month: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
}

export const AnomalyChart: React.FC<AnomalyChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomalies par Criticité</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critique" />
            <Bar dataKey="high" stackId="a" fill="#f97316" name="Élevée" />
            <Bar dataKey="medium" stackId="a" fill="#eab308" name="Normale" />
            <Bar dataKey="low" stackId="a" fill="#22c55e" name="Faible" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};