const Cache = require('../../util/cache');
const { getProductsWithDetail } = require('./product_controller');
const Marketing = require('../models/marketing_model');
const Product = require('../models/product_model');
const util = require('../../util/util');
const { CACHE_CAMPAIGN_KEY, CACHE_HOT_KEY } = require('../constants/cache');

const createCampaign = async (req, res) => {
  const body = req.body;
  const image = 'campaigns/' + req.files.main_image[0].filename;
  const campaign = {
    product_id: parseInt(body.product_id),
    picture: image,
    story: body.story,
  };
  const campaignId = await Marketing.createCampaign(campaign);
  try {
    if (Cache.ready) {
      await Cache.del(CACHE_CAMPAIGN_KEY);
    }
  } catch (error) {
    console.error(`Delete campaign cache error: ${error}`);
  }
  res.send({ campaignId });
};

const createHot = async (req, res) => {
  const body = req.body;
  const title = body.title;
  const productIds = body.product_ids.split(',');
  await Marketing.createHot(title, productIds);
  try {
    if (Cache.ready) {
      await Cache.del(CACHE_HOT_KEY);
    }
  } catch (error) {
    console.error(`Delete hot cache error: ${error}`);
  }
  res.status(200).send({ status: 'OK' });
};

const getCampaigns = async (req, res) => {
  try {
    if (Cache.ready) {
      const cacheCampaigns = await Cache.get(CACHE_CAMPAIGN_KEY);

      if (cacheCampaigns) {
        console.log('getCampaigns', 'Get campaign from cache');
        res.status(200).json({ data: JSON.parse(cacheCampaigns) });
        return;
      }
    }
  } catch (e) {
    console.error(`Get campaign cache error: ${e}`);
  }

  console.log('Get campaign from database');
  const campaigns = await Marketing.getCampaigns();
  campaigns.map((campaign) => {
    const assetsPath = util.getAssetsPath(req.protocol, req.hostname);
    campaign.picture = assetsPath + campaign.picture;
    return campaign;
  });

  try {
    if (Cache.ready) {
      await Cache.set(CACHE_CAMPAIGN_KEY, JSON.stringify(campaigns));
    }
  } catch (e) {
    console.error(`Set campaign cache error: ${e}`);
  }

  res.status(200).json({ data: campaigns });
};

const getHots = async (req, res) => {
  try {
    if (Cache.ready) {
      const cacheHots = await Cache.get(CACHE_HOT_KEY);

      if (cacheHots) {
        console.log('Get hot from cache');
        res.status(200).json({ data: JSON.parse(cacheHots) });
        return;
      }
    }
  } catch (e) {
    console.error(`Get hot cache error: ${e}`);
  }

  const hots = await Marketing.getHots();
  const hots_with_detail = await Promise.all(
    hots.map(async (hot) => {
      const products = await Product.getHotProducts(hot.id);
      const products_with_detail = await getProductsWithDetail(
        req.protocol,
        req.hostname,
        products
      );
      return {
        title: hot.title,
        products: products_with_detail,
      };
    })
  );

  try {
    if (Cache.ready) {
      await Cache.set(CACHE_HOT_KEY, JSON.stringify(hots_with_detail));
    }
  } catch (e) {
    console.error(`Set hot cache error: ${e}`);
  }

  res.status(200).json({ data: hots_with_detail });
};

module.exports = {
  createCampaign,
  createHot,
  getCampaigns,
  getHots,
};
