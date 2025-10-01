import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { DailyUpdate, DailyUpdateCreate } from '@/services/dailyUpdatesService';
import dailyUpdatesService from '@/services/dailyUpdatesService';

const formSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters long')
    .max(5000, 'Content must be less than 5000 characters'),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority level',
  }),
  expires_at: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DailyUpdateFormProps {
  initialData?: DailyUpdate;
  onSubmit: (data: DailyUpdateCreate) => Promise<void>;
}

export function DailyUpdateForm({ initialData, onSubmit }: DailyUpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      priority: initialData?.priority || 'medium',
      expires_at: initialData?.expires_at ? new Date(initialData.expires_at) : undefined,
    },
  });

  const watchedValues = watch();
  const priorityOptions = dailyUpdatesService.getPriorityOptions();

  const handleFormSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const submitData: DailyUpdateCreate = {
        title: data.title.trim(),
        content: data.content.trim(),
        priority: data.priority,
        expires_at: data.expires_at ? data.expires_at.toISOString() : null,
      };

      await onSubmit(submitData);
      
      if (!initialData) {
        reset(); // Reset form only for new updates
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setValue('expires_at', date);
    setCalendarOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="Enter update title..."
          {...register('title')}
          className={cn(errors.title && 'border-red-500')}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority *</Label>
        <Select
          value={watchedValues.priority}
          onValueChange={(value) => setValue('priority', value as 'low' | 'medium' | 'high')}
        >
          <SelectTrigger className={cn(errors.priority && 'border-red-500')}>
            <SelectValue placeholder="Select priority level" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${option.color}`} />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.priority && (
          <p className="text-sm text-red-500">{errors.priority.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content *</Label>
        <Textarea
          id="content"
          placeholder="Enter update content..."
          rows={6}
          {...register('content')}
          className={cn(errors.content && 'border-red-500')}
        />
        {errors.content && (
          <p className="text-sm text-red-500">{errors.content.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {watchedValues.content?.length || 0} / 5000 characters
        </p>
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !watchedValues.expires_at && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedValues.expires_at ? (
                format(watchedValues.expires_at, 'PPP')
              ) : (
                <span>Pick an expiry date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watchedValues.expires_at}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              initialFocus
            />
            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(undefined)}
                className="w-full"
              >
                Clear Date
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-sm text-muted-foreground">
          Leave empty to use default expiry (7 days from creation)
        </p>
      </div>

      {/* Preview */}
      {watchedValues.title && watchedValues.content && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{watchedValues.title}</h3>
              <div className={`px-2 py-1 rounded text-xs ${
                priorityOptions.find(p => p.value === watchedValues.priority)?.color || ''
              }`}>
                {priorityOptions.find(p => p.value === watchedValues.priority)?.label}
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap">{watchedValues.content}</p>
            {watchedValues.expires_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Expires: {format(watchedValues.expires_at, 'PPP')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            initialData ? 'Update' : 'Create Update'
          )}
        </Button>
      </div>
    </form>
  );
}

export default DailyUpdateForm;