import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Mail, Calendar } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'candidate',
    title: 'New candidate added',
    description: 'Sarah Johnson - Senior React Developer',
    time: '2 minutes ago',
    icon: User,
    color: 'sky-blue'
  },
  {
    id: 2,
    type: 'campaign',
    title: 'Campaign email opened',
    description: 'Michael Chen opened "JavaScript Opportunities"',
    time: '15 minutes ago',
    icon: Mail,
    color: 'sunrise'
  },
  {
    id: 3,
    type: 'interview',
    title: 'Interview scheduled',
    description: 'Technical interview with David Park',
    time: '1 hour ago',
    icon: Calendar,
    color: 'deep-sea'
  },
  {
    id: 4,
    type: 'candidate',
    title: 'Pipeline stage updated',
    description: 'Emma Wilson moved to "Qualified"',
    time: '3 hours ago',
    icon: User,
    color: 'sky-blue'
  }
];

export const ActivityFeed = () => {
  return (
    <Card className="p-6 shadow-card">
      <div className="mb-6">
        <h3 className="font-heading text-lg font-semibold text-card-foreground mb-2">
          Recent Activity
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          Latest updates from your talent pipeline
        </p>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors duration-200">
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                ${activity.color === 'sky-blue' ? 'bg-sky-blue/10' : ''}
                ${activity.color === 'sunrise' ? 'bg-sunrise/10' : ''}
                ${activity.color === 'deep-sea' ? 'bg-deep-sea/10' : ''}
              `}>
                <Icon className={`
                  w-4 h-4
                  ${activity.color === 'sky-blue' ? 'text-sky-blue' : ''}
                  ${activity.color === 'sunrise' ? 'text-sunrise' : ''}
                  ${activity.color === 'deep-sea' ? 'text-deep-sea' : ''}
                `} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-body font-medium text-sm text-card-foreground">
                  {activity.title}
                </h4>
                <p className="font-body text-sm text-muted-foreground mb-1">
                  {activity.description}
                </p>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};