<!-- massClientFeeDistributionApp.app -->
<!-- This Aura Application acts as a bridge (Lightning Out) to expose your LWC -->
<!-- so it can be hosted within a Visualforce page. -->
<aura:application access="GLOBAL" extends="ltng:outApp">
    <aura:dependency resource="c:massClientFeeDistribution"/>
</aura:application>