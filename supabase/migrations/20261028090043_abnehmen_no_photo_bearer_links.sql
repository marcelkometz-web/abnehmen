-- Keep private progress photos tied to a current approved session.
-- The app downloads authenticated blobs and never needs bearer URLs or copies
-- into another bucket. The separate explicit JPG export remains available.
begin;

create policy ab_photos_no_bearer_links
on storage.objects as restrictive for all to authenticated
using (
  bucket_id <> 'ab-progress-photos'
  or not storage.allow_any_operation(array[
    'object.sign', 'object.sign_many', 'object.sign_upload_url',
    'render.image_sign', 'object.copy', 'object.move',
    's3.object.copy', 's3.upload.part_copy'
  ])
)
with check (
  bucket_id <> 'ab-progress-photos'
  or not storage.allow_any_operation(array[
    'object.sign', 'object.sign_many', 'object.sign_upload_url',
    'render.image_sign', 'object.copy', 'object.move',
    's3.object.copy', 's3.upload.part_copy'
  ])
);

comment on policy ab_photos_no_bearer_links on storage.objects is
  'No ordinary-client signed links, signed uploads or server copies of private progress photos. Does not alter other buckets or explicit user-controlled JPG exports.';
notify pgrst, 'reload schema';
commit;
