'use client';

import { useEffect, useState } from 'react';
import { Card, DatePicker, Spin, Tabs, Statistic, Table, Typography, Progress, Tag, Button, Space, Divider, Alert, List, Badge, Calendar, Row, Col, Tooltip } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';
import { ShoppingCartOutlined, CrownOutlined, InfoCircleOutlined, CheckCircleOutlined, RightOutlined, HistoryOutlined, LineChartOutlined, RocketOutlined, BarChartOutlined } from '@ant-design/icons';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { formatNumber } from '@/utils/format';
import PageTitle from '@/components/PageTitle';
import { PlanType, subscriptionPlans } from '@/config/subscriptionPlans';

// Define types for the usage data
interface SubscriptionInfo {
  plan: PlanType;
  expiresAt: string;
  tokenLimit: number;
  toolCallLimit: number;
  extraTokens: number;
  extraToolCalls: number;
  tokenUsagePercentage: number;
  toolCallUsagePercentage: number;
}

interface UsageSummary {
  totalTokens: number;
  totalMessages: number;
  totalToolCalls: number;
  subscription: SubscriptionInfo;
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

// Helper function to format the plan name with an icon
function formatPlanName(plan: PlanType): string {
  return `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
}

function getPlanIcon(plan: PlanType) {
  const planIcons = {
    [PlanType.Free]: null,
    [PlanType.Basic]: <Tag color="blue">Basic</Tag>,
    [PlanType.Pro]: <Tag color="purple">Pro</Tag>,
    [PlanType.Enterprise]: <Tag color="gold">Enterprise</Tag>,
  };
  return planIcons[plan];
}

function getPlanColor(plan: PlanType) {
  switch (plan) {
    case PlanType.Free:
      return '#8c8c8c';
    case PlanType.Basic:
      return '#1677ff';
    case PlanType.Pro:
      return '#722ed1';
    case PlanType.Enterprise:
      return '#faad14';
    default:
      return '#1677ff';
  }
}

// Generate mock activity data for visualization
function generateActivityData() {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  
  const activityData: Record<string, number> = {};
  let currentDate = new Date(oneYearAgo);
  
  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    // Random activity value (0-4)
    activityData[dateStr] = Math.floor(Math.random() * 5);
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return activityData;
}

export default function UsageDashboard() {
  const { t } = useTranslation(['setting']);
  const userId = useUserStore(userProfileSelectors.userId);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  
  // Generate mock activity data
  const [activityData] = useState(generateActivityData());
  
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
        <PageTitle title="Usage Analytics" />
        <Typography.Paragraph>
          Please log in to view your usage statistics.
        </Typography.Paragraph>
      </Flexbox>
    );
  }
  
  const renderExpirationAlert = () => {
    if (!usageData?.summary.subscription) return null;
    
    const expirationDate = new Date(usageData.summary.subscription.expiresAt);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 7) {
      return (
        <Alert
          message="Subscription Expiring Soon"
          description={`Your subscription will expire in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}. Please renew to avoid interruption.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button type="primary" size="small">
              Renew Now
            </Button>
          }
        />
      );
    }
    
    return null;
  };
  
  const renderSubscriptionOverview = () => {
    if (!usageData?.summary.subscription) return null;
    
    const { subscription } = usageData.summary;
    const usedTokens = usageData.summary.totalTokens;
    const usedToolCalls = usageData.summary.totalToolCalls;
    const remainingTokens = Math.max(0, subscription.tokenLimit - usedTokens);
    const remainingToolCalls = Math.max(0, subscription.toolCallLimit - usedToolCalls);
    
    return (
      <Card 
        style={{ 
          borderRadius: 12, 
          marginBottom: 24,
          background: `linear-gradient(135deg, ${getPlanColor(subscription.plan)}15 0%, #ffffff 100%)`,
        }}
      >
        <Flexbox gap={24}>
          <Flexbox horizontal gap={48} align="center" style={{ flexWrap: 'wrap' }}>
            <Flexbox align="flex-start">
              <Typography.Text type="secondary">Current Subscription</Typography.Text>
              <Typography.Title level={3} style={{ margin: '8px 0', color: getPlanColor(subscription.plan) }}>
                {getPlanIcon(subscription.plan)} {formatPlanName(subscription.plan)}
              </Typography.Title>
              <Typography.Text>
                Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
              </Typography.Text>
            </Flexbox>
            
            <Divider type="vertical" style={{ height: 80 }} />
            
            <Statistic 
              title="Token Quota"
              value={subscription.tokenLimit}
              formatter={value => `${formatNumber(value)} tokens`}
            />
            
            <Statistic 
              title="Tool Call Limit"
              value={subscription.toolCallLimit}
              formatter={value => `${formatNumber(value)} calls`}
            />
            
            {subscription.extraTokens > 0 && (
              <Statistic 
                title="Bonus Tokens"
                value={subscription.extraTokens}
                formatter={value => `+${formatNumber(value)}`}
                valueStyle={{ color: '#52c41a' }}
              />
            )}
            
            {subscription.extraToolCalls > 0 && (
              <Statistic 
                title="Bonus Tool Calls"
                value={subscription.extraToolCalls}
                formatter={value => `+${formatNumber(value)}`}
                valueStyle={{ color: '#52c41a' }}
              />
            )}
            
            <Flexbox style={{ marginLeft: 'auto' }}>
              <Button type="primary" icon={<CrownOutlined />} size="large">
                Upgrade Plan
              </Button>
            </Flexbox>
          </Flexbox>
        </Flexbox>
      </Card>
    );
  };
  
  const renderUsageOverview = () => {
    if (!usageData?.summary.subscription) return null;
    
    const { subscription } = usageData.summary;
    const usedTokens = usageData.summary.totalTokens;
    const usedToolCalls = usageData.summary.totalToolCalls;
    const remainingTokens = Math.max(0, subscription.tokenLimit - usedTokens);
    const remainingToolCalls = Math.max(0, subscription.toolCallLimit - usedToolCalls);
    
    return (
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Token Usage" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Flexbox gap={16}>
              <Progress 
                type="dashboard"
                percent={subscription.tokenUsagePercentage} 
                strokeColor={subscription.tokenUsagePercentage > 90 ? 'red' : subscription.tokenUsagePercentage > 75 ? 'orange' : '#1677ff'}
                format={(percent) => (
                  <Flexbox gap={0}>
                    <Typography.Title level={3} style={{ margin: 0 }}>{percent}%</Typography.Title>
                    <Typography.Text type="secondary">Used</Typography.Text>
                  </Flexbox>
                )}
              />
              
              <Flexbox gap={12}>
                <Statistic 
                  title="Used"
                  value={usedTokens}
                  formatter={value => formatNumber(value)}
                  valueStyle={{ fontSize: '18px' }}
                  suffix="tokens"
                />
                <Statistic 
                  title="Remaining"
                  value={remainingTokens}
                  formatter={value => formatNumber(value)}
                  valueStyle={{ fontSize: '18px', color: remainingTokens < subscription.tokenLimit * 0.1 ? 'red' : undefined }}
                  suffix="tokens"
                />
              </Flexbox>
            </Flexbox>
            
            <Divider />
            
            <Button icon={<ShoppingCartOutlined />} type="primary" ghost block>
              Purchase Additional Tokens
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="Tool Call Usage" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Flexbox gap={16}>
              <Progress 
                type="dashboard"
                percent={subscription.toolCallUsagePercentage} 
                strokeColor={subscription.toolCallUsagePercentage > 90 ? 'red' : subscription.toolCallUsagePercentage > 75 ? 'orange' : '#1677ff'}
                format={(percent) => (
                  <Flexbox gap={0}>
                    <Typography.Title level={3} style={{ margin: 0 }}>{percent}%</Typography.Title>
                    <Typography.Text type="secondary">Used</Typography.Text>
                  </Flexbox>
                )}
              />
              
              <Flexbox gap={12}>
                <Statistic 
                  title="Used"
                  value={usedToolCalls}
                  formatter={value => formatNumber(value)}
                  valueStyle={{ fontSize: '18px' }}
                  suffix="calls"
                />
                <Statistic 
                  title="Remaining"
                  value={remainingToolCalls}
                  formatter={value => formatNumber(value)}
                  valueStyle={{ fontSize: '18px', color: remainingToolCalls < subscription.toolCallLimit * 0.1 ? 'red' : undefined }}
                  suffix="calls"
                />
              </Flexbox>
            </Flexbox>
            
            <Divider />
            
            <Button icon={<ShoppingCartOutlined />} type="primary" ghost block>
              Purchase Additional Tool Calls
            </Button>
          </Card>
        </Col>
      </Row>
    );
  };
  
  const renderActivityCalendar = () => {
    if (!usageData) return null;
    
    const getActivityLevel = (value: any) => {
      const date = value.format('YYYY-MM-DD');
      return activityData[date] || 0;
    };

    const dateCellRender = (value: any) => {
      const activityLevel = getActivityLevel(value);
      
      const colors = [
        '#f0f0f0', // level 0
        '#e6f7ff', // level 1
        '#bae7ff', // level 2
        '#91d5ff', // level 3
        '#40a9ff', // level 4
      ];
      
      return (
        <div
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: colors[activityLevel],
            borderRadius: '4px',
          }}
        />
      );
    };
    
    return (
      <Card title="Activity History" style={{ borderRadius: 12, marginBottom: 24 }}>
        <Calendar fullscreen={false} dateCellRender={dateCellRender} />
      </Card>
    );
  };

  const renderStatsSummary = () => {
    if (!usageData) return null;
    
    const { summary } = usageData;
    
    return (
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Statistic 
              title="Total Tokens Used"
              value={summary.totalTokens}
              formatter={value => formatNumber(value)}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
            <Typography.Paragraph type="secondary">
              All-time token usage across all models
            </Typography.Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Statistic 
              title="Total Messages"
              value={summary.totalMessages}
              formatter={value => formatNumber(value)}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Typography.Paragraph type="secondary">
              All messages exchanged with assistants
            </Typography.Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Statistic 
              title="Tool Calls"
              value={summary.totalToolCalls}
              formatter={value => formatNumber(value)}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Typography.Paragraph type="secondary">
              Specialized tools and functions used
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    );
  };
  
  return (
    <Flexbox gap={24}>
      <PageTitle title="Usage Analytics" />
      
      {loading ? (
        <Card style={{ borderRadius: 12 }}>
          <Flexbox style={{ minHeight: 400 }} align="center" justify="center">
            <Spin size="large" tip="Loading your usage data..." />
          </Flexbox>
        </Card>
      ) : (
        <>
          {renderExpirationAlert()}
          {renderSubscriptionOverview()}
          
          <Card style={{ borderRadius: 12, marginBottom: 24 }}>
            <Flexbox gap={16}>
              <Flexbox horizontal justify="space-between" align="center" style={{ width: '100%' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  <HistoryOutlined /> Usage Period
                </Typography.Title>
                <DatePicker.RangePicker 
                  onChange={handleDateRangeChange} 
                  style={{ width: 300 }}
                />
              </Flexbox>
            </Flexbox>
          </Card>
          
          {renderStatsSummary()}
          {renderUsageOverview()}
          {renderActivityCalendar()}
          
          {usageData && (
            <Tabs
              style={{ marginTop: 24 }}
              type="card"
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
                          render: (text) => <Typography.Text strong>{text}</Typography.Text>
                        },
                        {
                          title: "Provider",
                          dataIndex: 'provider',
                          key: 'provider',
                          render: (text) => <Tag color="blue">{text}</Tag>
                        },
                        {
                          title: "Tokens",
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
                          render: (text) => <Typography.Text strong>{text}</Typography.Text>
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
                          render: (type: string) => 
                            type === 'completion' 
                              ? <Tag color="green">AI Response</Tag> 
                              : <Tag color="blue">Tool Call</Tag>,
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
                          render: (tokens: number, record: ActivityEntry) => 
                            record.type === 'completion' ? formatNumber(tokens) : '-',
                        },
                      ]}
                      pagination={false}
                    />
                  ),
                },
              ]}
            />
          )}
          
          {/* Plans Section */}
          <Card title="Available Plans" style={{ borderRadius: 12, marginTop: 24 }}>
            <Flexbox gap={16}>
              <Typography.Paragraph>
                Compare our available plans and choose the one that best suits your needs.
              </Typography.Paragraph>
              
              <Table
                dataSource={Object.values(subscriptionPlans)}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: 'Plan',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text, record) => (
                      <Flexbox gap={8}>
                        {record.id === usageData?.summary.subscription.plan && (
                          <Badge status="processing" text="Current Plan" style={{ marginBottom: 8 }} />
                        )}
                        <Typography.Title level={5} style={{ margin: 0 }}>
                          {text}
                        </Typography.Title>
                        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                          {record.description}
                        </Typography.Paragraph>
                      </Flexbox>
                    ),
                  },
                  {
                    title: 'Monthly Price',
                    dataIndex: ['price', 'monthly'],
                    key: 'monthlyPrice',
                    render: (price) => `$${price.toFixed(2)}/month`,
                  },
                  {
                    title: 'Yearly Price',
                    dataIndex: ['price', 'yearly'],
                    key: 'yearlyPrice',
                    render: (price) => `$${price.toFixed(2)}/year`,
                  },
                  {
                    title: 'Token Limit',
                    dataIndex: 'monthlyTokenLimit',
                    key: 'tokenLimit',
                    render: (limit) => formatNumber(limit),
                  },
                  {
                    title: 'Tool Calls',
                    dataIndex: 'toolCallLimit',
                    key: 'toolCallLimit',
                    render: (limit) => formatNumber(limit),
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        {record.id === usageData?.summary.subscription.plan ? (
                          <Button disabled>Current Plan</Button>
                        ) : (
                          <Button
                            type="primary"
                            icon={record.id === PlanType.Free ? <RightOutlined /> : <CrownOutlined />}
                          >
                            {record.id === PlanType.Free ? 'Downgrade' : 'Upgrade'}
                          </Button>
                        )}
                      </Space>
                    ),
                  },
                ]}
                expandable={{
                  expandedRowRender: (record) => (
                    <List
                      header={<Typography.Title level={5}>Features</Typography.Title>}
                      dataSource={record.features}
                      renderItem={(item) => (
                        <List.Item>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                          {item}
                        </List.Item>
                      )}
                    />
                  ),
                }}
              />
            </Flexbox>
          </Card>
        </>
      )}
    </Flexbox>
  );
} 