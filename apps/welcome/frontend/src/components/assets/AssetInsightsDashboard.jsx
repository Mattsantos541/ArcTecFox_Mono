import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, DollarSign, Clock, Wrench, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';

const AssetInsightsDashboard = ({ parentAsset, childAssets }) => {
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildAsset, setSelectedChildAsset] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showAsPercentage, setShowAsPercentage] = useState(false);

  // Custom label component for reference line with background
  const CustomReferenceLineLabel = ({ viewBox, value }) => {
    if (!viewBox) return null;
    
    const { x, y, width } = viewBox;
    const labelX = x + width / 2; // Position at horizontal center
    const labelY = y; // Position vertically centered on the line
    
    // Approximate text dimensions (this is more reliable than getBBox in this context)
    const textLength = value.length * 7; // Rough character width estimation
    const textHeight = 14;
    const padding = 4;
    
    return (
      <g>
        {/* Background rectangle */}
        <rect
          x={labelX - textLength/2 - padding}
          y={labelY - textHeight/2 - padding/2}
          width={textLength + padding * 2}
          height={textHeight + padding}
          fill="white"
          stroke="#dc2626"
          strokeWidth={1}
          rx={3}
        />
        {/* Text */}
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: '#dc2626',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {value}
        </text>
      </g>
    );
  };
  
  // Initialize date range with install date as minimum
  useEffect(() => {
    if (parentAsset?.install_date) {
      const installDate = new Date(parentAsset.install_date);
      const today = new Date();
      setDateRange({
        start: installDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      });
    }
  }, [parentAsset]);

  // Fetch maintenance history and consumables
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      if (!parentAsset?.id) return;
      
      setLoading(true);
      try {
        // Build child asset IDs for filtering
        const childAssetIds = selectedChildAsset === 'all' 
          ? childAssets.map(c => c.id)
          : [selectedChildAsset];

        // Fetch completed task signoffs with task details
        let query = supabase
          .from('task_signoff')
          .select(`
            id,
            due_date,
            comp_date,
            total_expense,
            pm_tasks!inner (
              id,
              task_name,
              est_minutes,
              pm_plans!inner (
                id,
                child_asset_id,
                child_assets!inner (
                  id,
                  name,
                  parent_asset_id
                )
              )
            )
          `)
          .not('comp_date', 'is', null)
          .in('pm_tasks.pm_plans.child_asset_id', childAssetIds)
          .eq('pm_tasks.pm_plans.child_assets.parent_asset_id', parentAsset.id);

        // Apply date range filter if set
        if (dateRange.start) {
          query = query.gte('comp_date', dateRange.start);
        }
        if (dateRange.end) {
          query = query.lte('comp_date', dateRange.end);
        }

        const { data: signoffs, error: signoffError } = await query;
        
        if (signoffError) {
          console.error('Error fetching maintenance history:', signoffError);
        } else {
          setMaintenanceHistory(signoffs || []);
        }

        // Fetch consumables for these signoffs
        if (signoffs && signoffs.length > 0) {
          const signoffIds = signoffs.map(s => s.id);
          const { data: consumablesData, error: consumablesError } = await supabase
            .from('signoff_consumables')
            .select('*')
            .in('so_id', signoffIds)
            .eq('used', true);

          if (consumablesError) {
            console.error('Error fetching consumables:', consumablesError);
          } else {
            setConsumables(consumablesData || []);
          }
        } else {
          setConsumables([]);
        }
      } catch (error) {
        console.error('Error in fetchMaintenanceData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [parentAsset, childAssets, selectedChildAsset, dateRange]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!parentAsset || !maintenanceHistory) {
      return {
        daysInProduction: 0,
        maintenanceHours: 0,
        totalExpenses: 0,
        consumableExpenses: 0,
        operatingHours: 0,
        taskCount: 0
      };
    }

    // Calculate days in production
    const installDate = parentAsset.install_date ? new Date(parentAsset.install_date) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : new Date();
    const startDate = dateRange.start ? new Date(dateRange.start) : installDate;
    const daysInProduction = installDate ? Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;

    // Calculate maintenance hours (sum of est_minutes)
    const maintenanceMinutes = maintenanceHistory.reduce((sum, signoff) => {
      return sum + (signoff.pm_tasks?.est_minutes || 0);
    }, 0);
    const maintenanceHours = Math.round(maintenanceMinutes / 60 * 10) / 10;

    // Calculate total expenses
    const totalExpenses = maintenanceHistory.reduce((sum, signoff) => {
      return sum + (parseFloat(signoff.total_expense) || 0);
    }, 0);

    // Calculate consumable expenses
    const consumableExpenses = consumables.reduce((sum, consumable) => {
      return sum + (parseFloat(consumable.cost) || 0);
    }, 0);

    // Calculate operating hours based on selected assets
    let operatingHours = 0;
    if (selectedChildAsset === 'all') {
      // Sum operating hours for all child assets
      operatingHours = childAssets.reduce((sum, child) => {
        const hoursPerWeek = parseFloat(child.operating_hours) || 0;
        const weeks = daysInProduction / 7;
        return sum + (hoursPerWeek * weeks);
      }, 0);
    } else {
      // Get operating hours for selected child asset
      const selectedChild = childAssets.find(c => c.id === selectedChildAsset);
      if (selectedChild) {
        const hoursPerWeek = parseFloat(selectedChild.operating_hours) || 0;
        const weeks = daysInProduction / 7;
        operatingHours = hoursPerWeek * weeks;
      }
    }

    return {
      daysInProduction,
      maintenanceHours,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      consumableExpenses: Math.round(consumableExpenses * 100) / 100,
      operatingHours: Math.round(operatingHours),
      taskCount: maintenanceHistory.length
    };
  }, [parentAsset, maintenanceHistory, consumables, childAssets, selectedChildAsset, dateRange]);

  // Get replacement cost based on selection
  const getReplacementCost = () => {
    if (selectedChildAsset === 'all') {
      // Parent asset replacement cost (already includes child components)
      return parseFloat(parentAsset?.cost_to_replace) || 0;
    } else {
      // Selected child asset replacement cost (individual component cost)
      const selectedChild = childAssets.find(c => c.id === selectedChildAsset);
      return parseFloat(selectedChild?.cost_to_replace) || 0;
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!maintenanceHistory || maintenanceHistory.length === 0) return [];

    // Sort maintenance history by completion date
    const sortedHistory = [...maintenanceHistory].sort((a, b) => 
      new Date(a.comp_date) - new Date(b.comp_date)
    );

    // Group by month and calculate cumulative expenses
    const monthlyData = {};
    let cumulativeTotal = 0;
    let cumulativeConsumables = 0;

    sortedHistory.forEach(signoff => {
      const date = new Date(signoff.comp_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalExpense: 0,
          consumableExpense: 0,
          taskCount: 0
        };
      }

      const signoffConsumables = consumables.filter(c => c.so_id === signoff.id);
      const consumableCost = signoffConsumables.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);

      monthlyData[monthKey].totalExpense += parseFloat(signoff.total_expense) || 0;
      monthlyData[monthKey].consumableExpense += consumableCost;
      monthlyData[monthKey].taskCount += 1;
    });

    // Convert to array and add cumulative values
    const chartArray = Object.values(monthlyData).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    chartArray.forEach(item => {
      cumulativeTotal += item.totalExpense;
      cumulativeConsumables += item.consumableExpense;
      item.cumulativeTotal = Math.round(cumulativeTotal * 100) / 100;
      item.cumulativeConsumables = Math.round(cumulativeConsumables * 100) / 100;
      
      // Calculate percentage if replacement cost is available
      const replacementCost = getReplacementCost();
      if (showAsPercentage && replacementCost > 0) {
        item.displayTotal = Math.round((item.cumulativeTotal / replacementCost) * 10000) / 100;
        item.displayConsumables = Math.round((item.cumulativeConsumables / replacementCost) * 10000) / 100;
        item.replacementCostLine = 100;
      } else {
        item.displayTotal = item.cumulativeTotal;
        item.displayConsumables = item.cumulativeConsumables;
        item.replacementCostLine = replacementCost;
      }
    });

    return chartArray;
  }, [maintenanceHistory, consumables, showAsPercentage, selectedChildAsset, parentAsset, childAssets]);

  if (loading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Controls Section */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2 text-blue-900">Asset Filter</label>
            <select
              value={selectedChildAsset}
              onChange={(e) => setSelectedChildAsset(e.target.value)}
              className="flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-400"
            >
              <option value="all">All Assets (Parent + Children)</option>
              {childAssets.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">Start Date</label>
              <input
                type="date"
                value={dateRange.start || ''}
                min={parentAsset?.install_date || ''}
                max={dateRange.end || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">End Date</label>
              <input
                type="date"
                value={dateRange.end || ''}
                min={dateRange.start || parentAsset?.install_date || ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowAsPercentage(!showAsPercentage)}
            className="flex items-center gap-2 border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-blue-600"
          >
            {showAsPercentage ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {showAsPercentage ? 'Show as %' : 'Show as $'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Days in Production</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{summaryMetrics.daysInProduction}</div>
            <p className="text-xs text-blue-600">
              Since {dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'install'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Maintenance Hours</CardTitle>
            <Wrench className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-800">{summaryMetrics.maintenanceHours}</div>
            <p className="text-xs text-indigo-600">
              {summaryMetrics.taskCount} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-800">${summaryMetrics.totalExpenses}</div>
            <p className="text-xs text-emerald-600">
              ${summaryMetrics.consumableExpenses} consumables
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900">Operating Hours</CardTitle>
            <Clock className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-800">{summaryMetrics.operatingHours}</div>
            <p className="text-xs text-cyan-600">
              Total usage hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Chart */}
      <Card className="border-t-4 border-t-blue-600">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Cumulative Maintenance Expenses vs Replacement Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  label={{ 
                    value: showAsPercentage ? '% of Replacement Cost' : 'Cost', 
                    angle: -90, 
                    position: showAsPercentage ? 'insideLeft' : 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                  domain={[0, showAsPercentage ? 120 : Math.max(getReplacementCost() * 1.1, Math.max(...(chartData.map(d => d.displayTotal) || [0])) * 1.1)]}
                  tickFormatter={(value) => {
                    if (showAsPercentage) {
                      return `${value}%`;
                    } else {
                      if (value >= 1000) {
                        return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
                      }
                      return `$${value}`;
                    }
                  }}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (showAsPercentage) {
                      return `${value}%`;
                    } else {
                      if (value >= 1000) {
                        return `$${(value / 1000).toFixed(1)}k`;
                      }
                      return `$${value}`;
                    }
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="displayTotal" 
                  stroke="#1e40af" 
                  name="Total Expenses"
                  strokeWidth={3}
                  dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#1e40af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="displayConsumables" 
                  stroke="#0ea5e9" 
                  name="Consumables"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#0ea5e9' }}
                />
                <ReferenceLine 
                  y={showAsPercentage ? 100 : getReplacementCost()} 
                  stroke="#dc2626" 
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  label={(props) => (
                    <CustomReferenceLineLabel 
                      {...props}
                      value={showAsPercentage 
                        ? 'Replacement Cost (100%)'
                        : `Replacement Cost ($${getReplacementCost() >= 1000 ? (getReplacementCost() / 1000).toFixed(0) + 'k' : getReplacementCost()})`
                      }
                    />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              No maintenance history available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetInsightsDashboard;