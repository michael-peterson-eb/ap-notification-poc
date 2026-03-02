import React from 'react';
import Card from 'components/Card';

export const PreviewMessageCard = React.forwardRef(function PreviewMessageCard({ templateDetail }: any, ref: any) {
  return (
    <div ref={ref}>
      <Card className="p-6">
        <h3 className="text-xl font-medium mb-4">Preview the Message</h3>

        <div className="space-y-4">
          <details className="group border border-zinc-100 rounded p-4">
            <summary className="cursor-pointer list-none flex items-center justify-between font-medium">
              <span>Email</span>
              <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>

            <div className="mt-4 text-sm text-zinc-700 leading-relaxed">
              {templateDetail?.messagePreview?.email ? (
                <div dangerouslySetInnerHTML={{ __html: templateDetail.messagePreview.email }} />
              ) : (
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras condimentum augue est, cursus pellentesque dolor pellentesque scelerisque. Nulla id arcu ac justo bibendum dictum.
                  Curabitur sapien tortor, molestie ut est sed, suscipit fermentum neque.
                </p>
              )}
            </div>
          </details>

          <details className="group border border-zinc-100 rounded p-4">
            <summary className="cursor-pointer list-none flex items-center justify-between font-medium">
              <span>SMS</span>
              <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>

            <div className="mt-4 text-sm text-zinc-700 leading-relaxed">{templateDetail?.messagePreview?.sms ?? <p className="text-zinc-500">SMS preview will appear here.</p>}</div>
          </details>

          <details className="group border border-zinc-100 rounded p-4">
            <summary className="cursor-pointer list-none flex items-center justify-between font-medium">
              <span>Voice</span>
              <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>

            <div className="mt-4 text-sm text-zinc-700 leading-relaxed">{templateDetail?.messagePreview?.voice ?? <p className="text-zinc-500">Voice preview will appear here.</p>}</div>
          </details>
        </div>
      </Card>
    </div>
  );
});
