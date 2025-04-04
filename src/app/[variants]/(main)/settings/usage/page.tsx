'use client';

import { useEffect, useState } from 'react';
import { Card, DatePicker, Spin, Tabs, Statistic, Table, Typography } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { formatNumber } from '@/utils/format';
import PageTitle from '@/components/PageTitle';

// Define types for the usage data
interface UsageSummary {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalMessages: number;
}

interface ModelUsage {
  provider: string;
  model: string;
  totalTokens: number;
  messageCount: number;
}

interface ToolUsage {
  name: string;
  count: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
}

interface ActivityEntry {
  timestamp: string;
  model: string;
  provider: string;
  tokens: number;
  type: string;
  toolName?: string;
}

interface UsageData {
  summary: UsageSummary;
  modelBreakdown: ModelUsage[];
  toolUsage: ToolUsage[];
  dailyUsage: DailyUsage[];
  recentActivity: ActivityEntry[];
}

export default function UsageDashboard() {
  const { t } = useTranslation(['setting']);
  const userId = useUserStore(userProfileSelectors.userId);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  
  useEffect(() => {
    if (!userId) return;
    
    async function fetchUsageData() {
      try {
        let url = `/api/usage/stats?userId=${userId}`;
        
        if (dateRange[0]) {
          url += `&startDate=${dateRange[0].toISOString()}`;
        }
        
        if (dateRange[1]) {
          url += `&endDate=${dateRange[1].toISOString()}`;
        }
        
        const headers: HeadersInit = {};
        
        // Only add headers if userId is defined
        if (userId) {
          headers['x-user-id'] = userId;
          headers['x-auth-user-id'] = userId;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to fetch usage data');
        }
        
        const data = await response.json();
        setUsageData(data);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    setLoading(true);
    fetchUsageData();
  }, [userId, dateRange]);
  
  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
  };
  
  if (!userId) {
    return (
      <Flexbox gap={24}>
        <PageTitle title="Usage Tracking" />
        <Typography.Paragraph>
          Please log in to view your usage statistics.
        </Typography.Paragraph>
      </Flexbox>
    );
  }
  
  return (
    <Flexbox gap={24}>
      <PageTitle title="Usage Tracking" />
      
      <Card>
        <Flexbox gap={16}>
          <DatePicker.RangePicker onChange={handleDateRangeChange} />
          
          {loading ? (
            <Spin tip="Loading usage data..." />
          ) : (
            <Flexbox horizontal gap={48} align="center">
              <Statistic 
                title="Total Tokens" 
                value={formatNumber(usageData?.summary?.totalTokens || 0)} 
              />
              <Statistic 
                title="Input Tokens" 
                value={formatNumber(usageData?.summary?.inputTokens || 0)} 
              />
              <Statistic 
                title="Output Tokens" 
                value={formatNumber(usageData?.summary?.outputTokens || 0)} 
              />
              <Statistic 
                title="Messages" 
                value={formatNumber(usageData?.summary?.totalMessages || 0)} 
              />
            </Flexbox>
          )}
        </Flexbox>
      </Card>
      
      {!loading && usageData && (
        <Tabs
          items={[
            {
              key: 'models',
              label: "By Model",
              children: (
                <Table 
                  dataSource={usageData.modelBreakdown || []} 
                  rowKey={(record: ModelUsage) => `${record.provider}-${record.model}`}
                  columns={[
                    {
                      title: "Model",
                      dataIndex: 'model',
                      key: 'model',
                    },
                    {
                      title: "Provider",
                      dataIndex: 'provider',
                      key: 'provider',
                    },
                    {
                      title: "Total Tokens",
                      dataIndex: 'totalTokens',
                      key: 'totalTokens',
                      render: (tokens: number) => formatNumber(tokens),
                      sorter: (a: ModelUsage, b: ModelUsage) => a.totalTokens - b.totalTokens,
                      defaultSortOrder: 'descend',
                    },
                    {
                      title: "Messages",
                      dataIndex: 'messageCount',
                      key: 'messageCount',
                    },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: 'tools',
              label: "By Tool",
              children: (
                <Table 
                  dataSource={usageData.toolUsage || []} 
                  rowKey="name"
                  columns={[
                    {
                      title: "Tool",
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: "Usage Count",
                      dataIndex: 'count',
                      key: 'count',
                      sorter: (a: ToolUsage, b: ToolUsage) => a.count - b.count,
                      defaultSortOrder: 'descend',
                    },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: 'daily',
              label: "Daily Usage",
              children: (
                <Table 
                  dataSource={usageData.dailyUsage || []}
                  rowKey="date"  
                  columns={[
                    {
                      title: "Date",
                      dataIndex: 'date',
                      key: 'date',
                      render: (date: string) => new Date(date).toLocaleDateString(),
                    },
                    {
                      title: "Tokens",
                      dataIndex: 'tokens',
                      key: 'tokens',
                      render: (tokens: number) => formatNumber(tokens),
                      sorter: (a: DailyUsage, b: DailyUsage) => a.tokens - b.tokens,
                      defaultSortOrder: 'descend',
                    },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: 'recent',
              label: "Recent Activity",
              children: (
                <Table 
                  dataSource={usageData.recentActivity || []}
                  rowKey="timestamp"  
                  columns={[
                    {
                      title: "Timestamp",
                      dataIndex: 'timestamp',
                      key: 'timestamp',
                      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
                    },
                    {
                      title: "Type",
                      dataIndex: 'type',
                      key: 'type',
                      render: (type: string) => type === 'completion' ? 'AI Response' : 'Tool Call',
                    },
                    {
                      title: "Model/Tool",
                      key: 'modelOrTool',
                      render: (_, record: ActivityEntry) => 
                        record.type === 'tool' ? record.toolName : record.model,
                    },
                    {
                      title: "Provider",
                      dataIndex: 'provider',
                      key: 'provider',
                    },
                    {
                      title: "Tokens",
                      dataIndex: 'tokens',
                      key: 'tokens',
                      render: (tokens: number) => formatNumber(tokens),
                    },
                  ]}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      )}
    </Flexbox>
  );
} 