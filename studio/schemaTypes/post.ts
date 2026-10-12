import { defineArrayMember, defineField, defineType } from 'sanity';

const categories = ['Strength', 'Cardio', 'Recovery', 'Nutrition', 'Mobility', 'Mindset', 'Other'];

export default defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: categories },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3, validation: (rule) => rule.required() }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (rule) => rule.required() })],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'author', title: 'Author', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'publishedAt', title: 'Published date', type: 'datetime', validation: (rule) => rule.required() }),
    defineField({ name: 'readTime', title: 'Read time', type: 'string', description: 'Example: 8 min', validation: (rule) => rule.required() }),
    defineField({ name: 'featured', title: 'Featured post', type: 'boolean', initialValue: false }),
    defineField({
      name: 'body',
      title: 'Article body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [{ title: 'Bullet', value: 'bullet' }, { title: 'Numbered', value: 'number' }],
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'quote', title: 'Optional quote', type: 'text', rows: 3 }),
    defineField({ name: 'quoteAuthor', title: 'Quote author', type: 'string' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'category', media: 'coverImage' },
  },
});
