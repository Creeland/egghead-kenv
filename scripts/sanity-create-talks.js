// Shortcut: control+t

let {
  createSanityInstructorReference,
  eggheadSanityClient,
  createInstructorCollaborator,
} = await lib("sanity");
let { queryEggheadTalk } = await lib("egghead");
let { nanoid } = await npm("nanoid");
let { find } = await npm("lodash");

let talkSlug = await arg("Enter Talk Slug: ");
let eggheadTalk = await queryEggheadTalk(talkSlug);

let convertTalktoSanity = (talk) => {
  let {
    title,
    id,
    description,
    thumb_url,
    path,
    instructor,
    slug,
    instructor: { full_name },
    duration,
  } = talk;

  let sanityInstructor = createSanityInstructorReference(instructor.slug);

  return {
    _key: nanoid(),
    _type: "resource",
    type: "talk",
    externalType: "talk",
    slug: {
      _type: "slug",
      current: slug,
    },
    byline: `${full_name} • ${Math.round(duration / 60)}m`,
    path: `/talks/${slug}`,
    title,
    externalId: id,
    description,
    image: thumb_url,
    collaborators: [sanityInstructor],
  };
};

let sanityTalk = convertTalktoSanity(eggheadTalk);

try {
  await eggheadSanityClient.create(sanityTalk);
} catch (err) {
  if (err?.response?.body?.error?.items[0]?.error?.referenceID) {
    show(`
    <div>
      ${eggheadTalk.instructor.full_name} was not found in sanity... creating a reference and trying again
    </div>
  `);
    await createInstructorCollaborator(eggheadTalk.instructor.slug);
    await eggheadSanityClient.create(sanityTalk);
  } else {
    console.log(err);
  }
}
