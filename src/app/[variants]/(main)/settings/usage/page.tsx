'use client';

import { useEffect, useState } from 'react';
import { Card, DatePicker, Spin, Tabs, Statistic, Table, Typography, Progress, Tag, Button, Space, Divider, Alert, List, Badge } from 'antd';
import { Flexbox } from 'react-layout-kit';
import { useTranslation } from 'react-i18next';
import { ShoppingCartOutlined, CrownOutlined, InfoCircleOutlined, CheckCircleOutlined, RightOutlined } from '@ant-design/icons';
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
  
  const renderSubscriptionCard = () => {
    if (!usageData?.summary.subscription) return null;
    
    const { subscription } = usageData.summary;
    const usedTokens = usageData.summary.totalTokens;
    const usedToolCalls = usageData.summary.totalToolCalls;
    const remainingTokens = Math.max(0, subscription.tokenLimit - usedTokens);
    const remainingToolCalls = Math.max(0, subscription.toolCallLimit - usedToolCalls);
    
    const getPlanColor = (plan: PlanType) => {
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
    };
    
    return (
      <Card title="Subscription Information" style={{ marginBottom: 16 }}>
        <Flexbox gap={24}>
          <Flexbox horizontal gap={48} align="center">
            <Statistic 
              title="Current Plan"
              value={formatPlanName(subscription.plan)}
              prefix={getPlanIcon(subscription.plan)}
              valueStyle={{ color: getPlanColor(subscription.plan) }}
            />
            <Statistic 
              title="Expires On"
              value={new Date(subscription.expiresAt).toLocaleDateString()}
            />
            {subscription.extraTokens > 0 && (
              <Statistic 
                title="Extra Tokens"
                value={formatNumber(subscription.extraTokens)}
                suffix="tokens"
              />
            )}
            {subscription.extraToolCalls > 0 && (
              <Statistic 
                title="Extra Tool Calls"
                value={formatNumber(subscription.extraToolCalls)}
                suffix="calls"
              />
            )}
          </Flexbox>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <Flexbox gap={16}>
            <Typography.Title level={5}>Token Usage</Typography.Title>
            <Progress 
              percent={subscription.tokenUsagePercentage} 
              strokeColor={subscription.tokenUsagePercentage > 90 ? 'red' : subscription.tokenUsagePercentage > 75 ? 'orange' : '#1677ff'}
              status={subscription.tokenUsagePercentage >= 100 ? 'exception' : 'normal'}
            />
            <Flexbox horizontal gap={24} style={{ justifyContent: 'space-between' }}>
              <span>Used: {formatNumber(usedTokens)} tokens</span>
              <span>Remaining: {formatNumber(remainingTokens)} tokens</span>
              <span>Total: {formatNumber(subscription.tokenLimit)} tokens</span>
            </Flexbox>
          </Flexbox>
          
          <Flexbox gap={16}>
            <Typography.Title level={5}>Tool Call Usage</Typography.Title>
            <Progress 
              percent={subscription.toolCallUsagePercentage} 
              strokeColor={subscription.toolCallUsagePercentage > 90 ? 'red' : subscription.toolCallUsagePercentage > 75 ? 'orange' : '#1677ff'}
              status={subscription.toolCallUsagePercentage >= 100 ? 'exception' : 'normal'}
            />
            <Flexbox horizontal gap={24} style={{ justifyContent: 'space-between' }}>
              <span>Used: {formatNumber(usedToolCalls)} calls</span>
              <span>Remaining: {formatNumber(remainingToolCalls)} calls</span>
              <span>Total: {formatNumber(subscription.toolCallLimit)} calls</span>
            </Flexbox>
          </Flexbox>
          
          <Flexbox horizontal style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <Space>
              <Button icon={<ShoppingCartOutlined />}>Buy More Tokens</Button>
              <Button type="primary" icon={<CrownOutlined />}>Upgrade Plan</Button>
            </Space>
          </Flexbox>
        </Flexbox>
      </Card>
    );
  };
  
  return (
    <Flexbox gap={24}>
      <PageTitle title="Usage Tracking" />
      
      {loading ? (
        <Card>
          <Spin tip="Loading usage data..." />
        </Card>
      ) : (
        <>
          {renderExpirationAlert()}
          {renderSubscriptionCard()}
          
          <Card>
            <Flexbox gap={16}>
              <DatePicker.RangePicker onChange={handleDateRangeChange} />
              
              <Flexbox horizontal gap={48} align="center">
                <Statistic 
                  title="Total Tokens"
                  value={formatNumber(usageData?.summary?.totalTokens || 0)} 
                />
                <Statistic 
                  title="Total Messages" 
                  value={formatNumber(usageData?.summary?.totalMessages || 0)} 
                />
                <Statistic 
                  title="Tool Calls" 
                  value={formatNumber(usageData?.summary?.totalToolCalls || 0)} 
                />
              </Flexbox>
            </Flexbox>
          </Card>
          
          {usageData && (
            <>
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
            
              {/* Plans Comparison Section */}
              <Card title="Available Plans" style={{ marginTop: 16 }}>
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
                            {record.id === usageData.summary.subscription.plan && (
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
                            {record.id === usageData.summary.subscription.plan ? (
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
                  
                  <Divider />
                  
                  <Typography.Title level={4}>Additional Purchases</Typography.Title>
                  
                  <Flexbox horizontal gap={24}>
                    <Card title="Extra Tokens" style={{ flex: 1 }}>
                      <Flexbox gap={16} align="flex-start">
                        <Typography.Paragraph>
                          Need more tokens? Purchase additional tokens to use with your current plan.
                        </Typography.Paragraph>
                        
                        <Typography.Title level={3}>
                          ${subscriptionPlans[usageData.summary.subscription.plan].extraTokenPrice.toFixed(2)}
                          <Typography.Text type="secondary" style={{ fontSize: '16px' }}> / 1,000 tokens</Typography.Text>
                        </Typography.Title>
                        
                        <Button type="primary" icon={<ShoppingCartOutlined />}>
                          Buy Tokens
                        </Button>
                      </Flexbox>
                    </Card>
                    
                    <Card title="Extra Tool Calls" style={{ flex: 1 }}>
                      <Flexbox gap={16} align="flex-start">
                        <Typography.Paragraph>
                          Need more tool calls? Purchase additional tool calls for your current plan.
                        </Typography.Paragraph>
                        
                        <Typography.Title level={3}>
                          ${subscriptionPlans[usageData.summary.subscription.plan].extraToolCallPrice.toFixed(2)}
                          <Typography.Text type="secondary" style={{ fontSize: '16px' }}> / call</Typography.Text>
                        </Typography.Title>
                        
                        <Button type="primary" icon={<ShoppingCartOutlined />}>
                          Buy Tool Calls
                        </Button>
                      </Flexbox>
                    </Card>
                  </Flexbox>
                </Flexbox>
              </Card>
            </>
          )}
        </>
      )}
    </Flexbox>
  );
} 